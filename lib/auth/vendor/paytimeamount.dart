import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:mywheels/auth/vendor/vendordash.dart';
import 'package:mywheels/pageloader.dart';

import '../../config/authconfig.dart';
import '../../config/colorcode.dart';


class Exitpage extends StatefulWidget {
  final String vendorid;
  final String bookingid;
  final String vehicletype;
  final String vehiclenumber;
  final String username;
  final String phoneno;
  final String parkingtime;
  final String bookingtypetemporary;
  final String sts;
  final String cartype;
  final String parkingdate;
  final String bookType;
  final String otp;
  final String userid;
  final int currentTabIndex;
  const Exitpage({super.key,
    required this.bookingid,
    required this.otp,
    required this.vehicletype,
    required this.vehiclenumber,
    required this.username,
    required this.phoneno,
    required this.parkingtime,
    required this.bookingtypetemporary,
    required this.sts,
    required this.cartype,
    required this.vendorid,
    required this.parkingdate,
    required this.bookType,
    required this.userid,
    required this.currentTabIndex,
  });

  @override
  _ExitpageState createState() => _ExitpageState();
}

class _ExitpageState extends State<Exitpage> {
  int selectedTabIndex = 0;
  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time
  Timer? _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);
  List<Exitcharge> parkingCharges = [];  // Store the fetched parking charges

  double payableAmount = 0.0;
  bool isLoading = true;
  String fullDayChargeType = 'Full Day';
  bool isOtpEntered = false;
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double roundedAmount = 0.0;
  double decimalDifference = 0.0;
  double totalAmountWithTaxes = 0.0;
  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();

    // First fetch GST data
    fetchGstData().then((gstData) {
      if (mounted) {
        setState(() {
          gstPercentage = double.tryParse(gstData['gst'] ?? '0') ?? 0.0;
          handlingFee = double.tryParse(gstData['handlingfee'] ?? '0') ?? 0.0;
        });
      }
    }).then((_) {
      // Then fetch other data
      _initializeTimerAndData();
    });
  }
  @override
  void dispose() {
    _payableTimer?.cancel();  // Use null-aware operator
    super.dispose();
  }
  void _initializeTimerAndData() {
    // Only initialize timer if it hasn't been initialized yet
    if (_payableTimer == null || !_payableTimer!.isActive) {
      _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) {
          updatePayableTimes();
        }
      });
    }

    fetchParkingCharges(widget.vendorid, widget.vehicletype).then((charges) {
      if (mounted) {
        setState(() {
          parkingCharges = charges;
          isLoading = false;
        });
      }
    });

    fetchBookingData().then((data) {
      if (mounted) {
        setState(() {
          bookingDataNotifier.value = data;
          isLoading = false;
        });
        updatePayableTimes();
      }
    });
  }
  // Modify this function to calculate payable amount based on parking charges
  Future<List<Exitcharge>> fetchParkingCharges(String vendorId, String vehicleType) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/charges/$vendorId/$vehicleType');
    print('Fetching parking charges from URL: $url'); // Print the URL being called
    try {
      final response = await http.get(url);
      print('Response status: ${response.statusCode}'); // Print the response status code

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data'); // Print the response data

        final chargesData = data['transformedData'] ?? [];
        fullDayChargeType = data['fullDayCharge'] ?? 'FullDay';
        print('Full day charge type: $fullDayChargeType'); // Print the full day charge type

        // Map the charges data to Exitcharge objects
        List<Exitcharge> charges = chargesData.map<Exitcharge>((item) => Exitcharge.fromJson(item)).toList();
        print('Fetched charges: $charges'); // Print the fetched charges
        return charges;
      } else {
        print('Failed to fetch parking charges, status code: ${response.statusCode}'); // Print error status
        throw Exception('Failed to fetch parking charges');
      }
    } catch (e) {
      print('Error fetching charges: $e'); // Print any errors that occur
      return [];
    }
  }

  double calculatePayableAmount(Duration duration, String bookingType, String parkedDate, String parkedTime) {
    print("Calculating payable amount for duration: ${duration.inHours} hours for booking type: $bookingType");

    String bookingTypeLower = bookingType.toLowerCase();

    if (bookingTypeLower == 'hourly') {
      return calculateHourly(parkingCharges.map((e) => e.toJson()).toList(), duration);
    } else if (bookingTypeLower == '24 hours' ) {
      double fullDayChargeAmount = calculateFullDay(
        parkingCharges.map((e) => e.toJson()).toList(),
        duration,
        parkedDate,
        parkedTime,
        bookingTypeLower, // Pass booking type to determine calculation logic
      );
      print("Using full day amount: $fullDayChargeAmount");
      return fullDayChargeAmount;
    } else {
      print("Unknown booking type, returning 0");
      return 0.0;
    }
  }

// Calculate the full day charge based on booking type
  double calculateFullDay(List<Map<String, dynamic>> charges, Duration duration, String parkedDate, String parkedTime, String bookingType) {
    String chargeTypeToFind = fullDayChargeType.toLowerCase() == 'FullDay' ? '24 Hours' : 'Full Day';
    print('Looking for charge type: $chargeTypeToFind');

    // Find the charge matching the type
    var fullDayChargeData = charges.firstWhere(
          (c) => c['type'].toString().toLowerCase() == chargeTypeToFind.toLowerCase(),
      orElse: () {
        print('No charge found for type "$chargeTypeToFind". Available charges: $charges');
        return {'amount': 0.0, 'type': chargeTypeToFind};
      },
    );

    double fullDayAmount = double.tryParse(fullDayChargeData['amount'].toString()) ?? 0.0;
    print('Full day charge amount: $fullDayAmount');

    if (fullDayAmount == 0.0) {
      print('Warning: Full day charge amount is 0.0. Check API data for type "$chargeTypeToFind".');
    }

    DateTime parkingStart = parseParkingDateTime("$parkedDate $parkedTime");
    DateTime currentTime = DateTime.now();

    int numberOfPeriods = 1;

    if (fullDayChargeType.toLowerCase() == 'full day') {
      DateTime startDate = DateTime(parkingStart.year, parkingStart.month, parkingStart.day);
      DateTime endDate = DateTime(currentTime.year, currentTime.month, currentTime.day);
      numberOfPeriods = endDate.difference(startDate).inDays;
      numberOfPeriods = currentTime.isAfter(parkingStart) ? max(1, numberOfPeriods) : 1;
    } else {
      Duration timeElapsed = currentTime.difference(parkingStart);
      if (timeElapsed.inSeconds <= 0) {
        numberOfPeriods = 1;
      } else {
        double totalHours = timeElapsed.inSeconds / 3600.0;
        numberOfPeriods = max(1, (totalHours / 24).ceil());
        print("Precise calculation: $totalHours hours = $numberOfPeriods periods");
      }
    }

    double finalAmount = fullDayAmount * numberOfPeriods;
    print("Calculated full day amount: $finalAmount ($fullDayAmount * $numberOfPeriods)");
    return finalAmount;
  }
  double calculateHourly(List<Map<String, dynamic>> charges, Duration duration) {
    int totalHours = duration.inHours;
    if (duration.inMinutes % 60 > 0) totalHours += 1; // Round up to the next hour if there are any minutes
    double totalAmount = 0.0;

    print("Total Hours for Calculation: $totalHours");

    // List of possible initial charge types
    final initialChargeTypes = [
      '0 to 1 hour',
      '0 to 2 hours',
      '0 to 3 hours',
      '0 to 4 hours'
    ];

    // Find the smallest initial charge available
    Map<String, dynamic>? initialCharge;
    int minInitialHours = 5; // Higher than max initial hours (4)
    for (var charge in charges) {
      String chargeType = charge['type'].toString();
      if (initialChargeTypes.contains(chargeType)) {
        // Extract the second number (e.g., '1' from '0 to 1 hour')
        int hours = int.parse(RegExp(r'0 to (\d+)').firstMatch(chargeType)!.group(1)!);
        if (hours < minInitialHours) {
          minInitialHours = hours;
          initialCharge = charge;
        }
      }
    }

    // If no initial charge is found, default to 0.0
    initialCharge ??= {'amount': 0.0, 'type': '0 to 1 hour'};
    print("Selected Initial Charge: ${initialCharge['type']} - Amount: ${initialCharge['amount']}");

    // Parse initial hours correctly
    int initialHours = int.parse(RegExp(r'0 to (\d+)').firstMatch(initialCharge['type'])!.group(1)!);
    print("Initial Hours: $initialHours");

    // If total hours are within the initial period, return only the initial charge
    if (totalHours <= initialHours) {
      totalAmount = double.tryParse(initialCharge['amount'].toString()) ?? 0.0;
      print("Duration within initial period, Total Amount Payable (Hourly): $totalAmount");
      return totalAmount;
    }

    // Add initial charge amount
    totalAmount += double.tryParse(initialCharge['amount'].toString()) ?? 0.0;
    int remainingHours = totalHours - initialHours;

    print("Remaining Hours: $remainingHours");

    // Handle additional hours
    if (remainingHours > 0) {
      // List of possible additional charge types
      final additionalChargeTypes = [
        'Additional 1 hour',
        'Additional 2 hours',
        'Additional 3 hours',
        'Additional 4 hours'
      ];

      // Find the additional charge type
      var additionalCharge = charges.firstWhere(
            (charge) => additionalChargeTypes.contains(charge['type']),
        orElse: () => {'amount': 0.0, 'type': 'Additional 1 hour'},
      );

      print("Selected Additional Charge: ${additionalCharge['type']} - Amount: ${additionalCharge['amount']}");

      int blockHours = int.parse(RegExp(r'Additional (\d+)').firstMatch(additionalCharge['type'])!.group(1)!);
      int blocks = (remainingHours / blockHours).ceil(); // Round up to the next block
      double additionalAmount = blocks * (double.tryParse(additionalCharge['amount'].toString()) ?? 0.0);

      totalAmount += additionalAmount;
      print("Additional Blocks: $blocks, Additional Amount: $additionalAmount");
    }

    print("Total Amount Payable (Hourly): $totalAmount");
    return totalAmount;
  }
  void updatePayableTimes() {
    final now = DateTime.now();
    final updatedData = bookingDataNotifier.value.map((booking) {
      if (booking.status == 'PARKED') {
        final parkingTime = parseParkingDateTime(
          "${booking.parkeddate} ${booking.parkedtime}",
        );
        final elapsed = now.difference(parkingTime);

        // Update the payable duration
        booking.payableDuration = elapsed;

        // Calculate the payable amount using updated calculation
        double payableAmount = calculatePayableAmount(
          elapsed,
          booking.bookType,
          booking.parkeddate,
          booking.parkedtime,
        );

        print("Booking ID: ${booking.id}, Elapsed Time: $elapsed, Payable Amount: $payableAmount");
      }
      return booking;
    }).toList();

    setState(() {
      bookingDataNotifier.value = updatedData;
    });
  }

  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
    final response = await http.get(url);

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonResponse = json.decode(response.body);
      final List<dynamic>? data = jsonResponse['bookings'];

      if (data == null || data.isEmpty) {
        throw 'No bookings available';
      }

      return data.map((item) => Bookingdata.fromJson(item)).toList();
    } else {
      throw response.body;
    }
  }
  Future<Map<String, dynamic>> fetchGstData() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}vendor/getgstfee'));
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data is List && data.isNotEmpty) {
        return data[0]; // Return the first GST entry
      }
      return {'gst': '0', 'handlingfee': '0'};
    } else {
      throw Exception('Failed to load GST fees');
    }
  }

  double roundUpToNearestRupee(double amount) {
    return amount.ceilToDouble();
  }

// Then modify your calculation methods like this:

  double calculateTotalWithTaxes(double payableAmount) {
    // Round up parking charge first
    double roundedParkingCharge = roundUpToNearestRupee(payableAmount);

    // Calculate GST on the rounded parking charge
    double gstAmount = (roundedParkingCharge * gstPercentage) / 100;
    double roundedGst = roundUpToNearestRupee(gstAmount);

    // Round up handling fee (if it's not already a whole number)
    double roundedHandlingFee = roundUpToNearestRupee(handlingFee);

    // Calculate total by summing all rounded values
    double totalAmount = roundedParkingCharge + roundedGst + roundedHandlingFee;

    // Store the rounded values for display
    roundedAmount = totalAmount;
    decimalDifference = totalAmount - (payableAmount + gstAmount + handlingFee);

    return totalAmount;
  }
  Future<void> updateExitData(String bookingId, Duration totalDuration, String formattedDuration, double totalAmount) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/exitvehicle/$bookingId');

    try {
      // Calculate GST and handling fee amounts if userid is not empty
      double roundedParkingCharge = roundUpToNearestRupee(totalAmount);
      double roundedGst = roundUpToNearestRupee((roundedParkingCharge * gstPercentage) / 100);
      double roundedHandlingFee = roundUpToNearestRupee(handlingFee);
      double finalTotal = roundedParkingCharge + roundedGst + roundedHandlingFee;
      Map<String, dynamic> requestBody = {
        'amount': roundedParkingCharge,
        'hour': formattedDuration,
      };




      if (widget.userid.isNotEmpty) {
        requestBody['gstamout'] = roundedGst;
        requestBody['handlingfee'] = roundedHandlingFee;
        requestBody['totalamout'] = finalTotal;
      }
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode(requestBody),
      );

      if (response.statusCode == 200) {
        print('Booking updated successfully');

        Navigator.pop(context); // Pop current screen
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => vendordashScreen(
              vendorid: widget.vendorid,
              initialTabIndex: widget.currentTabIndex,
            ),
          ),
        );

      } else {
        throw Exception('Failed to update booking: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      print('Error updating booking: $e');
    }
  }
  DateTime parseParkingDateTime(String dateTimeString) {
    final parts = dateTimeString.split(' ');
    final dateParts = parts[0].split('-');
    final timeParts = parts[1].split(':');
    int day = int.parse(dateParts[0]);
    int month = int.parse(dateParts[1]);
    int year = int.parse(dateParts[2]);
    int hour = int.parse(timeParts[0]);
    int minute = int.parse(timeParts[1]);
    String ampm = parts.length > 2 ? parts[2] : 'AM';

    if (ampm == 'PM' && hour != 12) hour += 12;
    if (ampm == 'AM' && hour == 12) hour = 0;

    return DateTime(year, month, day, hour, minute);
  }


  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final textScaleFactor = MediaQuery.of(context).textScaleFactor;

    return isLoading
        ? const LoadingGif()
        : Scaffold(
      // appBar: AppBar(
      //   backgroundColor: ColorUtils.secondarycolor(),
      //   titleSpacing: 0,
      //   title: Text(
      //     "Exit",
      //     style: GoogleFonts.poppins(),
      //   ),
      // ),
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(

            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(30), // Top-left corner radius
              topRight: Radius.circular(30), // Top-right corner radius
            ),
          ),
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: screenWidth * 0.04,
              // vertical: screenHeight * 0.01,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
const SizedBox(height: 10,),

                Column(
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [


                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        Text(
                          "Vehicle No: ${widget.vehiclenumber}",
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            color: ColorUtils.primarycolor(),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        InkWell(
                          onTap: () {
                            print('Close button pressed'); // Debug print
                            Navigator.pop(context);
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8), // Add padding for a larger tap area
                            child: const Icon(Icons.cancel_outlined, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
// // Text("data"),

//                 const Divider(),
                const Divider(),
                // Circular Progress Indicator with Gradient and Ticks
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween, // This will space children equally
                  crossAxisAlignment: CrossAxisAlignment.start, // Align items at the top
                  children: [
                    // First widget (the Stack with CircularProgressIndicator)
                    Flexible(
                      flex: 0, // Equal flex
                      child: Container(

                        padding: EdgeInsets.all(screenWidth * 0.01),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: screenWidth * 0.35, // Slightly reduced size
                              height: screenWidth * 0.35,
                              child: CircularProgressIndicator(
                                value: 0.5,
                                strokeWidth: 4,
                                valueColor: AlwaysStoppedAnimation(
                                  ColorUtils.primarycolor(),
                                ),
                                backgroundColor: Colors.black,
                              ),
                            ),
                            CustomPaint(
                              size: Size(screenWidth * 0.35, screenWidth * 0.35),
                              painter: RadialTicksPainter(),
                            ),
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SvgPicture.asset(
                                  'assets/car.svg',
                                  width: screenWidth * 0.08, // Slightly reduced size
                                  height: screenWidth * 0.08,
                                ),
                                SizedBox(height: screenHeight * 0.002),
                                Text(
                                  'PAYABLE TIME',
                                  style: GoogleFonts.poppins(
                                    color: Colors.black,
                                    fontSize: 10 * textScaleFactor,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                SizedBox(height: screenHeight * 0.002),
                                ValueListenableBuilder<List<Bookingdata>>(
                                  valueListenable: bookingDataNotifier,
                                  builder: (context, bookingData, child) {
                                    final booking = bookingData.firstWhere(
                                          (booking) => booking.id == widget.bookingid,
                                      orElse: () => Bookingdata(
                                        bookingtype:"",
                                        vendorname: "",
                                        username: '',
                                        mobilenumber: '',
                                        id: widget.bookingid,
                                        vehicleNumber: '',
                                        bookingDate: '',
                                        bookingTime: '',
                                        status: '',
                                        vehicletype: '',
                                        Cartype: '',
                                        Amount: '',
                                        Hour: '',
                                        Vendorid: '',
                                        sts: '',
                                        payableDuration: Duration.zero,
                                        subscriptiontype: '',
                                        parkingTime: '',
                                        parkingDate: '',
                                        Approvedate: '',
                                        Approvedtime: '',
                                        parkeddate: '',
                                        parkedtime: '', bookType: '', otp: '', userid: '', subscriptionenddate: '', invoice: '', totalamout: '', amount: '', invoiceid: '', exitvehicledate: '', exitvehicletime: '',
                                      ),
                                    );

                                    if (booking.id == widget.bookingid) {
                                      return Text(
                                        formatDuration(booking.payableDuration),
                                        style: GoogleFonts.poppins(
                                          color: Colors.black,
                                          fontSize: 10 * textScaleFactor,
                                        ),
                                      );
                                    } else {
                                      return Text(
                                        "No bookings available",
                                        style: GoogleFonts.poppins(
                                          color: Colors.grey,
                                          fontSize: 10 * textScaleFactor,
                                        ),
                                      );
                                    }
                                  },
                                ),
                                // Text(
                                //   'Time left',
                                //   style: GoogleFonts.poppins(
                                //     color: Colors.grey,
                                //     fontSize: 10 * textScaleFactor,
                                //   ),
                                // ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
const SizedBox(width: 10,),
                    // Second widget (the details container)
                    Flexible(
                      flex: 1, // Equal flex
                      child: Container(
                        child: Padding(
                          padding: EdgeInsets.all(screenWidth * 0.01),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Booking ID:",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                  ValueListenableBuilder<List<Bookingdata>>(
                                    valueListenable: bookingDataNotifier,
                                    builder: (context, bookingData, child) {
                                      final booking = bookingData.firstWhere(
                                            (booking) => booking.id == widget.bookingid,
                                        orElse: () => Bookingdata(
                                          bookingtype: "",
                                          vendorname: "",
                                          username: '',
                                          mobilenumber: '',
                                          id: '',
                                          vehicleNumber: '',
                                          bookingDate: '',
                                          bookingTime: '',
                                          status: '',
                                          vehicletype: '',
                                          Cartype: '',
                                          Amount: '',
                                          Hour: '',
                                          Vendorid: '',
                                          sts: '',
                                          payableDuration: Duration.zero,
                                          subscriptiontype: '',
                                          parkingTime: '',
                                          parkingDate: '',
                                          Approvedate: '',
                                          Approvedtime: '',
                                          parkeddate: '',
                                          parkedtime: '',
                                          bookType: '',
                                          otp: '',
                                          userid: '', subscriptionenddate: '', invoice: '', totalamout: '', amount: '', invoiceid: '', exitvehicledate: '', exitvehicletime: '',
                                        ),
                                      );

                                      if (booking.id.isEmpty) {
                                        return Text(
                                          "Calculating...",
                                          style: GoogleFonts.poppins(
                                            fontSize: 12 * textScaleFactor,
                                            color: Colors.black,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        );
                                      }

                                      double payableAmount = calculatePayableAmount(
                                        booking.payableDuration,
                                        booking.bookType,
                                        booking.parkeddate,
                                        booking.parkedtime,
                                      );

                                      return  Text(
                                        ' ${booking.id.length > 8 ? booking.id.substring(booking.id.length - 8) : booking.id}',
                                        style: GoogleFonts.poppins(
                                          color: Colors.grey,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10 * textScaleFactor,
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                              const Divider(),
                              SizedBox(height: screenHeight * 0.001),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "In Time: ",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                  Text(
                                    "${widget.parkingdate ?? ''} ${widget.parkingtime ?? ''}",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(),
                              SizedBox(height: screenHeight * 0.001),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Name: ",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                  Text(
                                    " ${widget.username ?? ''}",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(),

                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Mobile Number: ",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                  Text(
                                    " ${widget.phoneno}",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Booking Type: ",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                  Text(
                                    '${widget.sts ?? ''} (${widget.bookType ?? ''})',
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),

                                ],
                              ),
                              const Divider(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Booked by: ",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                  Text(
                                    " ${widget.userid.isEmpty ? 'Vendor' : 'Customer'}",
                                    style: GoogleFonts.poppins(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10 * textScaleFactor,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: screenHeight * 0.001),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),





                // const Divider(),
                const Divider(),
const SizedBox(height: 5,),
                // const Divider(),
                // Replace the GST, Handling Fee, and Total Amount sections with this
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Parking Charges:",
                      style: GoogleFonts.poppins(
                        fontSize: 12 * textScaleFactor,
                        color: Colors.black,
                      ),
                    ),
                    ValueListenableBuilder<List<Bookingdata>>(
                      valueListenable: bookingDataNotifier,
                      builder: (context, bookingData, child) {
                        final booking = bookingData.firstWhere(
                              (booking) => booking.id == widget.bookingid,
                          orElse: () => Bookingdata(
                            bookingtype: "",
                            vendorname: "",
                            username: '',
                            mobilenumber: '',
                            id: '',
                            vehicleNumber: '',
                            bookingDate: '',
                            bookingTime: '',
                            status: '',
                            vehicletype: '',
                            Cartype: '',
                            Amount: '',
                            Hour: '',
                            Vendorid: '',
                            sts: '',
                            payableDuration: Duration.zero,
                            subscriptiontype: '',
                            parkingTime: '',
                            parkingDate: '',
                            Approvedate: '',
                            Approvedtime: '',
                            parkeddate: '',
                            parkedtime: '',
                            bookType: '',
                            otp: '',
                            userid: '', subscriptionenddate: '', invoice: '', totalamout: '', amount: '', invoiceid: '', exitvehicledate: '', exitvehicletime: '',
                          ),
                        );

                        if (booking.id.isEmpty) {
                          return Text(
                            "Calculating...",
                            style: GoogleFonts.poppins(
                              fontSize: 12 * textScaleFactor,
                              color: Colors.black,
                              // fontWeight: FontWeight.bold,
                            ),
                          );
                        }

                        double payableAmount = calculatePayableAmount(
                          booking.payableDuration,
                          booking.bookType,
                          booking.parkeddate,
                          booking.parkedtime,
                        );

                        return Text(
                          "₹${roundUpToNearestRupee(payableAmount).toStringAsFixed(2)}",
                          style: GoogleFonts.poppins(
                            fontSize: 12 * textScaleFactor,
                            color: Colors.black,
                            // fontWeight: FontWeight.bold,/
                          ),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 4,),
                // const Divider(),
              if (widget.userid.isNotEmpty) ...[

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Handling Fee:",
                      style: GoogleFonts.poppins(
                        fontSize: 12 * textScaleFactor,
                        color: Colors.black,
                      ),
                    ),
                    Text(
                      "₹${handlingFee.toStringAsFixed(2)}",
                      style: GoogleFonts.poppins(
                        fontSize: 12 * textScaleFactor,
                        color: Colors.black,
                        // fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5,),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "GST ($gstPercentage%):",
                      style: GoogleFonts.poppins(
                        fontSize: 12 * textScaleFactor,
                        color: Colors.black,
                      ),
                    ),
                    ValueListenableBuilder<List<Bookingdata>>(
                      valueListenable: bookingDataNotifier,
                      builder: (context, bookingData, child) {
                        final booking = bookingData.firstWhere(
                              (booking) => booking.id == widget.bookingid,
                          orElse: () => Bookingdata(
                            bookingtype:"",
                            vendorname: "",
                            username: '',
                            mobilenumber: '',
                            id: '',
                            vehicleNumber: '',
                            bookingDate: '',
                            bookingTime: '',
                            status: '',
                            vehicletype: '',
                            Cartype: '',
                            Amount: '',
                            Hour: '',
                            Vendorid: '',
                            sts: '',
                            payableDuration: Duration.zero,
                            subscriptiontype: '',
                            parkingTime: '',
                            parkingDate: '',
                            Approvedate: '',
                            Approvedtime: '',
                            parkeddate: '',
                            parkedtime: '', bookType: '', otp: '', userid: '', subscriptionenddate: '', invoice: '', totalamout: '', amount: '', invoiceid: '', exitvehicledate: '', exitvehicletime: '',
                            // Your default booking data
                          ),
                        );

                        if (booking.id.isEmpty) return const Text("Calculating...");

                        double payableAmount = calculatePayableAmount(
                          booking.payableDuration,
                          booking.bookType,
                          booking.parkeddate,
                          booking.parkedtime,
                        );
                        double gstAmount = (payableAmount * gstPercentage) / 100;

                        return Text(
                          "₹${roundUpToNearestRupee((roundUpToNearestRupee(payableAmount) * gstPercentage) / 100).toStringAsFixed(2)}",
                          style: GoogleFonts.poppins(
                            fontSize: 12 * textScaleFactor,
                            color: Colors.black,
                            // fontWeight: FontWeight.bold,
                          ),
                        );
                      },
                    ),
                  ],
                ),
                // SizedBox(height: 5,),
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceBetween,
                //   children: [
                //     Text(
                //       "Round Off:",
                //       style: GoogleFonts.poppins(
                //         fontSize: 12 * textScaleFactor,
                //         color: Colors.black,
                //       ),
                //     ),
                //     Text(
                //       "₹${decimalDifference.toStringAsFixed(2)}", // Shows +0.85 if rounding 2.15 → 3.00
                //     ),
                //   ],
                // ),
                const SizedBox(height: 5,),

                // Total Amount
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Payable Amount:",
                      style: GoogleFonts.poppins(
                        fontSize: 14 * textScaleFactor,
                        color: ColorUtils.primarycolor(),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    ValueListenableBuilder<List<Bookingdata>>(
                      valueListenable: bookingDataNotifier,
                      builder: (context, bookingData, child) {
                        final booking = bookingData.firstWhere(
                              (booking) => booking.id == widget.bookingid,
                          orElse: () => Bookingdata(
                            subscriptionenddate: "",
                            bookingtype:"",
                            vendorname: "",
                            username: '',
                            mobilenumber: '',
                            id: '',
                            vehicleNumber: '',
                            bookingDate: '',
                            bookingTime: '',
                            status: '',
                            vehicletype: '',
                            Cartype: '',
                            Amount: '',
                            Hour: '',
                            Vendorid: '',
                            sts: '',
                            payableDuration: Duration.zero,
                            subscriptiontype: '',
                            parkingTime: '',
                            parkingDate: '',
                            Approvedate: '',
                            Approvedtime: '',
                            parkeddate: '',
                            parkedtime: '', bookType: '', otp: '', userid: '', invoice: '', totalamout: '', amount: '', invoiceid: '', exitvehicledate: '', exitvehicletime: '',
                            // Your default booking data
                          ),
                        );

                        if (booking.id.isEmpty) return const Text("Calculating...");

                        double payableAmount = calculatePayableAmount(
                          booking.payableDuration,
                          booking.bookType,
                          booking.parkeddate,
                          booking.parkedtime,
                        );
                        double total = calculateTotalWithTaxes(payableAmount);

                        return Text(
                          "₹${calculateTotalWithTaxes(payableAmount).toStringAsFixed(2)}",
                          style: GoogleFonts.poppins(
                            fontSize: 14 * textScaleFactor,
                            color: ColorUtils.primarycolor(),
                            fontWeight: FontWeight.bold,
                          ),
                        );
                      },
                    ),

                // if (widget.userid.isNotEmpty)
                // Pinput(
                //   controller: _otpController,
                //   length: 3,
                //   mainAxisAlignment: MainAxisAlignment.center,
                //   defaultPinTheme: PinTheme(
                //     width: screenWidth * 0.1,
                //     height: screenWidth * 0.1,
                //     textStyle: GoogleFonts.poppins(
                //       fontSize: 20 * textScaleFactor,
                //       color: Colors.black,
                //       fontWeight: FontWeight.w600,
                //     ),
                //     decoration: BoxDecoration(
                //       color: Colors.white,
                //       borderRadius: BorderRadius.circular(8),
                //       border: Border.all(color: ColorUtils.primarycolor()),
                //     ),
                //   ),
                //   focusedPinTheme: PinTheme(
                //     width: screenWidth * 0.12,
                //     height: screenWidth * 0.12,
                //     textStyle: GoogleFonts.poppins(
                //       fontSize: 20 * textScaleFactor,
                //       color: ColorUtils.primarycolor(),
                //       fontWeight: FontWeight.bold,
                //     ),
                //     decoration: BoxDecoration(
                //       color: Colors.white,
                //       borderRadius: BorderRadius.circular(8),
                //       border: Border.all(
                //         color: ColorUtils.primarycolor(),
                //         width: 2,
                //       ),
                //     ),
                //   ),
                //   onCompleted: (otp) {
                //     setState(() {
                //       isOtpEntered = true; // Set to true when OTP is entered
                //     });
                //     // Optionally, you can also verify the OTP here
                //   },
                // ),

              ],
            ),
                ],
                SizedBox(height: screenHeight * 0.02),
// In your build method, replace the Exit button section with:

        if (!isLoading) ...[
                Align(
                  alignment: Alignment.bottomRight,
                  child: SizedBox(
                    height: screenHeight * 0.04,
                    // width: screenWidth * 0.2,
                    child: ElevatedButton(
                      onPressed: () {
                        final booking = bookingDataNotifier.value.firstWhere(
                              (booking) => booking.id == widget.bookingid,
                          orElse: () => Bookingdata(
                            subscriptionenddate: " ",
                            bookingtype: "",
                            vendorname: "",
                            username: '',
                            mobilenumber: '',
                            id: '',
                            vehicleNumber: '',
                            bookingDate: '',
                            bookingTime: '',
                            status: '',
                            vehicletype: '',
                            Cartype: '',
                            Amount: '',
                            Hour: '',
                            Vendorid: '',
                            sts: '',
                            payableDuration: Duration.zero,
                            subscriptiontype: '',
                            parkingTime: '',
                            parkingDate: '',
                            Approvedate: '',
                            Approvedtime: '',
                            parkeddate: '',
                            parkedtime: '',
                            bookType: '',
                            otp: '',
                            userid: '', invoice: '', totalamout: '', amount: '', invoiceid: '', exitvehicledate: '', exitvehicletime: '',
                          ),
                        );

                        if (booking.id.isNotEmpty) {
                          double payableAmount = calculatePayableAmount(
                            booking.payableDuration,
                            booking.bookType,
                            booking.parkeddate,
                            booking.parkedtime,
                          );
                          int hours = booking.payableDuration.inHours;
                          int minutes = booking.payableDuration.inMinutes % 60;
                          int seconds = booking.payableDuration.inSeconds % 60;

                          String formattedDuration =
                              '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

                          updateExitData(
                            booking.id,
                            booking.payableDuration,
                            formattedDuration,
                            payableAmount,
                          );
                        }
                      },

                      style: ElevatedButton.styleFrom(
                        backgroundColor: ColorUtils.primarycolor(),
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.exit_to_app,
                            color: Colors.white,
                            size: screenWidth * 0.05,
                          ),
                          SizedBox(width: screenWidth * 0.02),
                          Text(
                            'Exit Vehicle',
                            style: GoogleFonts.poppins(
                              fontSize: 12 * textScaleFactor,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
],
                SizedBox(height: screenHeight * 0.05),
          ]),
        ),
      ),
      ),
    ));
  }
  String formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0'); // Ensure two digits
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0'); // Ensure two digits
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0'); // Ensure two digits

    return '$hours.$minutes.$seconds'; // Format as HH.MM.SS
  }
}














class RadialTicksPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Paint tickPaint = Paint()
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 12) / 2;

    const int totalTicks = 130;
    const double tickLength = 10;
    const double largeTickLength = 10;

    for (int i = 0; i < totalTicks; i++) {
      final angle = (2 * pi / totalTicks) * i - pi / 2; // Start at top
      final isLargeTick = i % 5 == 0;

      // Determine the color based on the angle
      if (angle >= -pi / 2 && angle <= pi / 2) {
        tickPaint.color = ColorUtils.primarycolor();
      } else {
        tickPaint.color = Colors.black; // Other half (left side)
      }

      final tickStart = Offset(
        center.dx + (radius - (isLargeTick ? largeTickLength : tickLength)) * cos(angle),
        center.dy + (radius - (isLargeTick ? largeTickLength : tickLength)) * sin(angle),
      );
      final tickEnd = Offset(
        center.dx + radius * cos(angle),
        center.dy + radius * sin(angle),
      );
      canvas.drawLine(tickStart, tickEnd, tickPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}



class Exitcharge {
  final double amount;
  final String type;
  final String fullDayCharge;

  Exitcharge({
    required this.amount,
    required this.type,
    required this.fullDayCharge,
  });

  factory Exitcharge.fromJson(Map<String, dynamic> json) {
    double parsedAmount = 0.0;
    if (json['amount'] is String) {
      parsedAmount = double.tryParse(json['amount']) ?? 0.0;
    } else if (json['amount'] is num) {
      parsedAmount = json['amount'].toDouble();
    }
    return Exitcharge(
      fullDayCharge: json['fullDayCharge'] ?? '',
      amount: parsedAmount,
      type: json['type'] ?? '',
    );
  }
  // Add the toJson method
  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'type': type,
      'fullDayCharge': fullDayCharge,
    };
  }
}