import 'dart:async';
import 'dart:convert';

import 'package:animated_custom_dropdown/custom_dropdown.dart';
import 'package:animated_toggle_switch/animated_toggle_switch.dart';
import 'package:bottom_picker/bottom_picker.dart';
import 'package:bottom_picker/resources/arrays.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http show get, post;
import 'package:intl/intl.dart' show DateFormat;
import 'package:mywheels/auth/customer/bookticket.dart';
import 'package:mywheels/auth/customer/parking/monthlysubscriptionpayment.dart';
import 'package:mywheels/pageloader.dart';
import 'auth/customer/addcarviewcar/Addmycar.dart';
import 'auth/customer/parking/bookparking.dart';
import 'auth/vendor/vendorcreatebooking.dart';
import 'config/authconfig.dart';
import 'config/colorcode.dart';
import 'model/user.dart';

class ExploreBook extends StatefulWidget {
  final String vendorId;
  final String userId;
  final String vendorName;

  const ExploreBook({
    super.key,
    required this.vendorId,
    required this.userId,
    required this.vendorName,
  });

  @override
  _ExploreBookState createState() => _ExploreBookState();
}

class _ExploreBookState extends State<ExploreBook> {
  final SingleSelectController<String?> carController =
      SingleSelectController(null);
  final SingleSelectController<String?> _parkingPlaceController =
      SingleSelectController(null);
  bool _isLoading = false;
  bool isHourly = true;
  String? dropdownValue; // Initial selected value
  final FocusNode _dateTimeFocusNode = FocusNode();
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double totalAmountWithTaxes = 0.0;
  double totalPayableAmount = 0.0;
  // String? _selectedCarType;
  final List<String> subscriptionOptions = [
    "Weekly Subscription",
    "Monthly Subscription",

    // Add more options as needed
  ];
  bool isLoading = false; // Add loading state
  List<Vendor> vendors = []; // List to hold vendors
  Vendor? selectedVendor; // Variable to hold the selected vendor
  List<String> cars = []; // List to hold cars
  Map<String, String> carTypeMap = {}; // Map to store car model and its type
  String? selectedCarType; // Variable to hold selected car type
  Color customTeal = ColorUtils.primarycolor();
  DateTime? selectedDateTime;
  String? _id;
  late Future<List<Vendor>> _vendors;
  List<BusinessHours> businessHours = [];
  bool isVendorOpen = false;
  String closedReason = "";
  static const int minimumScheduleHours = 2; // Minimum hours for scheduling
  String? _selectedOption = 'Instant';
  String? selectedParkingPlace;
  String? selectedCar;
  String?
      _selectedSubscriptionType; // Variable to store the selected subscription type

  User? _user;
  final TextEditingController dateTimeController = TextEditingController();

  final TextEditingController mobileController = TextEditingController();
  final TextEditingController nameController = TextEditingController();
  // String? selectedCarType;
  final TextEditingController datTimeController = TextEditingController();
  final TextEditingController subscriptionController = TextEditingController();
  final TextEditingController dateeTimeController = TextEditingController();
  final TextEditingController CartypeController = TextEditingController();
  final TextEditingController dateController = TextEditingController();
  final TextEditingController timeController = TextEditingController();
  final TextEditingController checkout = TextEditingController();
  final TextEditingController subscriptionDateTimeController =
      TextEditingController();
  final FocusNode _checkout = FocusNode();
  final FocusNode _subscriptionFocusNode = FocusNode();
  late Timer _timer;
  List<dynamic> charges = [];
  List<dynamic> charge = [];
  void _handleCarControllerChange() {
    if (!mounted) return;
    final value = carController.value;
    if (value == null) return;

    setState(() {
      selectedCarType = carTypeMap[value];
      charges = [];
      charge = [];

      if (selectedCarType != null) {
        checkBusinessHours(widget.vendorId).then((_) {
          checkIfVendorIsOpen();
        });
        fetchmonth(selectedCarType!);
        fetchChargesData(selectedCarType!);
        fetchavailability(widget.vendorId, selectedCarType!);
      }
    });
  }

  // Add this method to handle _parkingPlaceController changes
  void _handleParkingPlaceControllerChange() {
    if (!mounted) return;
    setState(() {
      print("Parking place selected: ${_parkingPlaceController.value}");
      selectedVendor = widget.vendorId as Vendor?; // Adjust based on your Vendor class
      print("Selected Vendor: ${widget.vendorName}, ID: ${widget.vendorId}");
      if (selectedVendor != null) {
        checkBusinessHours(selectedVendor!.id).then((_) {
          checkIfVendorIsOpen();
        });
      }
    });
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
  int availableSlots = 0; // Declare this in your state class
  double roundUpToNearestRupee(double amount) {
    return amount.ceilToDouble();
  }
  double calculateTotalWithTaxes(double payableAmount) {
    // Round up base amount first
    double roundedBaseAmount = roundUpToNearestRupee(payableAmount);

    // Calculate GST on the rounded base amount and round it up
    double gstAmount = (roundedBaseAmount * gstPercentage) / 100;
    double roundedGst = roundUpToNearestRupee(gstAmount);

    // Round up handling fee
    double roundedHandlingFee = roundUpToNearestRupee(handlingFee);

    // Calculate total by summing all rounded values
    totalAmountWithTaxes = roundedBaseAmount + roundedGst + roundedHandlingFee;

    return totalAmountWithTaxes;
  }
  Future<void> fetchmonth(String selectedCarType) async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchmonth/${widget.vendorId}/$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        if (!mounted) return;
        setState(() {
          if (data is List) {
            charge = List<Map<String, dynamic>>.from(data);
          } else if (data['vendor'] != null && data['vendor']['charges'] != null) {
            charge = List<Map<String, dynamic>>.from(data['vendor']['charges']);
          } else {
            print('Charges data is missing or invalid in the response.');
            charge = [];
          }
        });
      } else {
        print('Failed to load charges data. Status Code: ${response.statusCode}');
        if (!mounted) return;
        setState(() {
          charges = [];
        });
      }
    } catch (e) {
      print('Error fetching charges explr error data: $e');
      if (!mounted) return;
      setState(() {
        charges = [];
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }
  Future<void> fetchChargesData(String selectedCarType) async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final url = '${ApiConfig.baseUrl}vendor/fetchbookcharge/${widget.vendorId}/$selectedCarType';
      print('Fetching charges explore from: $url');

      final response = await http.get(Uri.parse(url));
      print('Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        List<dynamic> chargesList = [];
        if (data is List) {
          chargesList = data;
        } else if (data['charges'] != null) {
          chargesList = data['charges'];
        } else {
          print('Charges key not found in response');
        }

        if (!mounted) return;
        setState(() => charges = List<Map<String, dynamic>>.from(chargesList));
      } else {
        print('Failed to fetch charges: ${response.statusCode}');
        if (!mounted) return;
        setState(() => charges = []);
      }
    } catch (e, stackTrace) {
      print('Error: $e\n$stackTrace');
      if (!mounted) return;
      setState(() => charges = []);
    } finally {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> fetchavailability(String vendorId, String selectedCarType) async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/bookavailability?vendorId=$vendorId&vehicleType=$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        if (!mounted) return;
        setState(() {
          availableSlots = data['availableSlots'] ?? 0;
        });
      } else {
        print('Failed to load availability. Status Code: ${response.statusCode}');
        if (!mounted) return;
        setState(() {
          availableSlots = 0;
        });
      }
    } catch (e) {
      print('Error fetching availability: $e');
      if (!mounted) return;
      setState(() {
        availableSlots = 0;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    datTimeController.text = _formatDateTime(now);
    dateTimeController.text = _getFormattedCurrentDateTime();
    selectedDateTime = now;
    _parkingPlaceController.value = widget.vendorName;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        dateTimeController.text = _getFormattedCurrentDateTime();
        if (_selectedOption == 'Instant') {
          checkIfVendorIsOpen();
        }
      });
    });
    carController.addListener(_handleCarControllerChange);
    _parkingPlaceController.addListener(_handleParkingPlaceControllerChange);
    fetchCars(widget.userId);
    // Fetch GST data
    fetchGstData().then((data) {
      setState(() {
        gstPercentage = double.tryParse(data['gst']?.toString() ?? '0') ?? 0.0;
        handlingFee = double.tryParse(data['handlingfee']?.toString() ?? '0') ?? 0.0;
      });
    }).catchError((e) {
      print('Error fetching GST data: $e');
      setState(() {
        gstPercentage = 0.0;
        handlingFee = 0.0;
      });
    });
  }
  String _formatDateTime(DateTime dateTime) {
    return DateFormat("dd-MM-yyyy hh:mm a")
        .format(dateTime); // Full date + time with AM/PM
  }

  @override
  void dispose() {
    _timer.cancel();
    carController.removeListener(_handleCarControllerChange); // Remove listener

    carController.dispose();
    _parkingPlaceController.dispose();
    dateTimeController.dispose();
    checkout.dispose();
    subscriptionDateTimeController.dispose();
    _dateTimeFocusNode.dispose();
    _checkout.dispose();
    _subscriptionFocusNode.dispose();
    super.dispose();
  }
  Future<void> checkBusinessHours(String vendorId) async {
    try {
      print("🔄 Fetching business hours for vendorId: $vendorId");

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchbusinesshours/$vendorId'),
      );

      print("✅ Response status: ${response.statusCode}");
      print("📩 Raw response body: ${response.body}");

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print("📦 Decoded JSON: $data");

        setState(() {
          businessHours = (data['businessHours'] as List)
              .map((json) => BusinessHours.fromJson(json))
              .toList();

          print("⏰ Business hours parsed: $businessHours");

          // Check if vendor is currently open
          checkIfVendorIsOpen();
          print("🏪 Vendor open check triggered");
        });
      } else {
        print("⚠️ Failed to fetch business hours. Status code: ${response.statusCode}");
      }
    } catch (e) {
      print('❌ Error fetching business hours: $e');
    }
  }

  void checkIfVendorIsOpen() {
    if (widget.vendorId == null || businessHours.isEmpty) {
      setState(() {
        isVendorOpen = false;
        closedReason = ""; // Avoid showing any message
      });
      print("Vendor status: Skipped - No vendor selected or no business hours available");
      return;
    }

    // Determine which date to check based on the selected option
    DateTime checkDateTime;

    if (_selectedOption == 'Schedule' && selectedDateTime != null) {
      checkDateTime = selectedDateTime!;
    } else if (_selectedOption == 'Subscription' && selectedDateTime != null) {
      checkDateTime = selectedDateTime!;
    } else {
      // For Instant, always use the current time
      checkDateTime = DateTime.now();
    }

    final currentDay = DateFormat('EEEE').format(checkDateTime);
    final currentTime = DateFormat('HH:mm').format(checkDateTime);

    print("Checking vendor availability for: $currentDay at $currentTime");

    // Find the business hours for the selected/current day
    final todayHours = businessHours.firstWhere(
          (hours) => hours.day.toLowerCase() == currentDay.toLowerCase(),
      orElse: () => BusinessHours.empty(),
    );

    if (todayHours.day.isEmpty) {
      setState(() {
        isVendorOpen = false;
        closedReason = "Closed on $currentDay";
      });
      print("Vendor status: Closed - No business hours for $currentDay");
      return;
    }

    // Check if the day is completely closed
    if (todayHours.isClosed) {
      setState(() {
        isVendorOpen = false;
        closedReason = "Closed on $currentDay";
      });
      print("Vendor status: Closed - Entire day is closed");
      return;
    }

    // Check if it's 24 hours open
    if (todayHours.is24Hours) {
      setState(() {
        isVendorOpen = true;
        closedReason = "";
      });
      print("Vendor status: Open - 24 hours");
      return;
    }

    // Parse times for comparison
    final openTime = TimeOfDay(
      hour: int.parse(todayHours.openTime.split(':')[0]),
      minute: int.parse(todayHours.openTime.split(':')[1]),
    );

    final closeTime = TimeOfDay(
      hour: int.parse(todayHours.closeTime.split(':')[0]),
      minute: int.parse(todayHours.closeTime.split(':')[1]),
    );

    final currentTimeOfDay = TimeOfDay.fromDateTime(checkDateTime);

    final isOpen = (currentTimeOfDay.hour > openTime.hour ||
        (currentTimeOfDay.hour == openTime.hour &&
            currentTimeOfDay.minute >= openTime.minute)) &&
        (currentTimeOfDay.hour < closeTime.hour ||
            (currentTimeOfDay.hour == closeTime.hour &&
                currentTimeOfDay.minute <= closeTime.minute));

    setState(() {
      isVendorOpen = isOpen;
      closedReason = isOpen ? "" : "Closed at selected time. Opens at ${todayHours.openTime}";
    });

    print("Vendor status: ${isOpen ? 'Open' : 'Closed'} - Time-based check");
  }
  Future<void> _payNow() async {
    print("---- PAY NOW FUNCTION CALLED ----");

    // Validate required fields
    if (widget.vendorId == null) {
      print("Validation failed: Vendor ID is null");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a parking place")),
      );
      return;
    }
    if (selectedCarType == null) {
      print("Validation failed: Vehicle type is null");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a vehicle type")),
      );
      return;
    }
    if (carController.value == null) {
      print("Validation failed: Vehicle not selected");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a Vehicle")),
      );
      return;
    }
    if (selectedDateTime == null) {
      print("Validation failed: DateTime not selected");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a date and time")),
      );
      return;
    }
    if (_selectedOption == 'Subscription' && subscriptionDateTimeController.text.isEmpty) {
      print("Validation failed: Subscription date empty");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a starting date for the subscription")),
      );
      return;
    }
    if (_selectedOption == 'Subscription' && charge.isEmpty) {
      print("Validation failed: No subscription charges available");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("No subscription charges available for the selected vendor and vehicle type")),
      );
      return;
    }

    // Format the date and time
    String formattedDate = DateFormat("dd-MM-yyyy").format(selectedDateTime!);
    String formattedTime = DateFormat("hh:mm a").format(selectedDateTime!);
    DateTime now = DateTime.now();
    print("Selected Date: $formattedDate, Time: $formattedTime, Now: $now");

    // Determine the amount based on the selected option
    String amount = '';
    String hour = '';
    if (_selectedOption == 'Subscription') {
      if (charge.isNotEmpty) {
        amount = charge[0]['amount']?.toString() ?? '0';
      }
    } else {
      if (charges.isNotEmpty) {
        amount = charges[0]['amount']?.toString() ?? '0';
        hour = charges[0]['type']?.toString() ?? '';
      }
    }
    print("Option: $_selectedOption | Amount: $amount | Hour: $hour");

    // Calculate total amount with taxes
    double baseAmount = double.tryParse(amount) ?? 0.0;
    totalPayableAmount = calculateTotalWithTaxes(baseAmount);
    print("Base Amount: $baseAmount | Total With Taxes: $totalPayableAmount");

    // Prepare data to pass to MonthlySub
    var data = {
      'userid': widget.userId,
      'place': widget.vendorName ?? '',
      'vehicleNumber': carController.value ?? '',
      'vendorName': widget.vendorName ?? '',
      'time': formattedTime,
      'vendorId': widget.vendorId ?? '',
      'bookingDate': DateFormat("dd-MM-yyyy").format(now),
      'parkingDate': formattedDate,
      'carType': selectedCarType ?? '',
      'personName': _user?.username ?? '',
      'mobileNumber': _user?.mobileNumber ?? '',
      'sts': _selectedOption ?? 'Instant',
      'amount': amount,
      'hour': hour,
      'subscriptionType': _selectedSubscriptionType ?? '',
      'status': "PENDING",
      'vehicleType': selectedCarType ?? '',
      'parkingTime': formattedTime,
      'bookingTime': DateFormat("hh:mm a").format(now),
      'cancelledStatus': "",
      'bookType': isHourly ? 'Hourly' : '24 Hours',
      'gstPercentage': gstPercentage.toString(),
      'handlingFee': handlingFee.toString(),
      'totalAmountWithTaxes': totalPayableAmount.toString(),
    };

    print("---- DATA TO BE PASSED TO MONTHLYSUB ----");
    data.forEach((key, value) {
      print("$key : $value");
    });

    // Navigate to MonthlySub with the data
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => monthlysub(
          totalamount: totalPayableAmount.toString(),
          userId: data['userid']!,
          place: data['place']!,
          vehicleNumber: data['vehicleNumber']!,
          vendorName: data['vendorName']!,
          time: data['time']!,
          vendorId: data['vendorId']!,
          bookingDate: data['bookingDate']!,
          parkingDate: data['parkingDate']!,
          carType: data['carType']!,
          personName: data['personName']!,
          mobileNumber: data['mobileNumber']!,
          sts: data['sts']!,
          amount: data['amount']!,
          hour: data['hour']!,
          subscriptionType: data['subscriptionType']!,
          status: data['status']!,
          vehicleType: data['vehicleType']!,
          parkingTime: data['parkingTime']!,
          bookingTime: data['bookingTime']!,
          cancelledStatus: data['cancelledStatus']!,
          bookType: data['bookType']!,
          gstPercentage: data['gstPercentage']!,
          handlingFee: data['handlingFee']!,
          totalAmountWithTaxes: data['totalAmountWithTaxes']!,
        ),
      ),
    );
  }

  Future<void> _registerParking() async {


    if (carController.value == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a Vehicle")),
      );
      return;
    }

    if (selectedDateTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a date and time")),
      );
      return;
    }

    // Format the date and time
    String formattedDate = DateFormat("dd-MM-yyyy").format(selectedDateTime!);
    String formattedTime = DateFormat("hh:mm a").format(selectedDateTime!);
    DateTime now = DateTime.now();

    try {
      // Determine the amount based on the selected option
      String amount = '';
      String hour = '';
      if (_selectedOption == 'Subscription') {
        // Use the first item in the charge list for subscription amount
        if (charge.isNotEmpty) {
          amount = charge[0]['amount']?.toString() ?? '0';
        }
      } else {
        // For Instant or Schedule, use charges list if needed
        if (charges.isNotEmpty) {
          amount = charges[0]['amount']?.toString() ?? '0';
          hour = charges[0]['type']?.toString() ?? '';
        }
      }

      var data = {
        'userid': widget.userId,
        'place': widget.vendorName, // Provide a default value
        'vehicleNumber': carController.value ?? '', // Provide a default value
        "vendorName": widget.vendorName, // Provide a default value
        'time': formattedTime,
        'vendorId': widget.vendorId, // Use vendor ID instead of vendor name
        'bookingDate': DateFormat("dd-MM-yyyy").format(now),
        'parkingDate': formattedDate,
        'carType': selectedCarType ?? '', // Provide a default value
        'personName': _user?.username ?? '', // Provide a default value
        'mobileNumber': _user?.mobileNumber ?? '', // Provide a default value
        'sts': _selectedOption ?? 'Instant', // Provide a default value
        'amount': amount, // Pass the subscription amount for Subscription
        'hour': hour,
        'subsctiptiontype':
            _selectedSubscriptionType ?? '', // Provide a default value
        'status': "PENDING",
        'vehicleType': selectedCarType!, // Provide a default value
        'parkingTime': formattedTime,
        'bookingTime': DateFormat("hh:mm a").format(now),
        'cancelledStatus': "",
        'bookType': isHourly ? 'Hourly' : '24 Hours',
      };

      // Debugging: Print the data being sent
      print('Sending data to server: $data');

      setState(() {
        _isLoading = true;
      });

      var response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}vendor/createbooking'),
        body: jsonEncode(data),
        headers: {"Content-Type": "application/json"},
      );
      String bookedDate = DateFormat("dd-MM-yyyy").format(now); // Example: current date
      String status = "PENDING"; // Example: set status as "Confirmed"
      String schedule = formattedDate; // Example: use the parking date as schedule

      // Debugging: Print the response status and body
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final String otp = responseData['otp'].toString();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Parking registered successfully!')),
        );
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => bookticket(
              mobileno: _user?.mobileNumber ?? '',
              bookingtype:  (responseData['bookType'] ?? "").toString(),
              sts: (responseData['sts'] ?? "").toString(),
              otp: (responseData['otp'] ?? "").toString(),
              bookedid: _id ?? '',
              vehiclenumber: carController.value ?? '',
              vendorname: widget.vendorName ?? '',
              vendorid: widget.vendorId ?? '',
              parkingdate: formattedDate,
              parkingtime: formattedTime,
              vehicletype: selectedCarType ?? '',
              bookeddate: bookedDate, // Pass the booked date
              status: status, // Pass the status
              schedule: schedule,
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(' ${response.body}')),
        );
      }
    } catch (e) {
      print('Error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error connecting to server')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  bool noVehiclesFound = false; // Add this variable to track if no vehicles are found

  Future<void> fetchCars(String userId) async {
    try {
      print('Fetching cars for userId: $userId'); // Log userId
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-vehicle?id=$userId'));

      print('Response status: ${response.statusCode}'); // Log response status
      print('Response body: ${response.body}'); // Log response body

      if (response.statusCode == 200) {
        Map<String, dynamic> jsonResponse = json.decode(response.body);
        List<dynamic> vehiclesJson = jsonResponse['vehicles'] ?? [];
        setState(() {
          if (vehiclesJson.isEmpty) {
            noVehiclesFound = true; // Set flag if no vehicles are found
          } else {
            noVehiclesFound = false; // Reset flag if vehicles are found
            cars = vehiclesJson.map<String>((car) {
              final model = car['vehicleNo'] ?? 'Unknown Model'; // Safely access `model`
              final vehicletype = car['type'] ?? 'No vehicle type'; // Safely access `type`
              carTypeMap[model] = vehicletype; // Store the model and its type in the map
              print('Vehicle Model: $model, Vehicle Type: $vehicletype'); // Log model and type
              return model;
            }).toList();
          }
          isLoading = false;
        });
        print('Fetched cars: $cars'); // Log the fetched car list
      } else {
        throw Exception('Failed to load cars');
      }
    } catch (error) {
      print('Error fetching cars: $error'); // Log the error
      setState(() {
        isLoading = false;
        noVehiclesFound = true; // Set flag to true on error
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No Vehicles found..Add vehicle')),
      );
    }
  }
  String _getFormattedCurrentDateTime() {
    DateTime now = DateTime.now();
    DateFormat formatter =
        DateFormat('yyyy-MM-dd hh:mm a'); // 12-hour format with AM/PM
    return formatter.format(now);
  }
  void _showDateTimePickerForSubscription() {
    DateTime now = DateTime.now();
    DateTime minDateTime = DateTime(now.year, now.month, now.day, now.hour + minimumScheduleHours);

    DateTime initialDateTime = now.isBefore(minDateTime) ? minDateTime : now;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return SafeArea(
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: BottomPicker.dateTime(
              initialDateTime: initialDateTime,
              minDateTime: minDateTime,
              maxDateTime: DateTime(2099, 12, 31),
              pickerTitle: Text(_formatDateTime(initialDateTime)),
              onSubmit: (dateTime) {
                DateTime currentNow = DateTime.now();
                if (dateTime.isBefore(currentNow.add(const Duration(hours: minimumScheduleHours)))) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Please select a time at least $minimumScheduleHours hour(s) in the future!")),
                  );
                  return;
                }
                setState(() {
                  selectedDateTime = dateTime;
                  subscriptionDateTimeController.text = _formatDateTime(dateTime);
                  print("Selected Subscription Date: ${subscriptionDateTimeController.text}");

                  // Add this line to refresh business hours check
                  if (widget.vendorId != null) {
                    checkBusinessHours(widget.vendorId).then((_) {
                      checkIfVendorIsOpen();
                    });
                  }
                });
              },
              bottomPickerTheme: BottomPickerTheme.temptingAzure,
            ),
          ),
        );
      },
    );
  }
  void _tenditivecheckout() {
    DateTime now = DateTime.now();
    DateTime initialDateTime = now;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return SafeArea(
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: BottomPicker.dateTime(
              initialDateTime: initialDateTime,
              minDateTime: DateTime(now.year, now.month, now.day),
              maxDateTime: DateTime(2099, 12, 31),
              pickerTitle: Text(_formatDateTime(initialDateTime)),
              onSubmit: (dateTime) {
                DateTime currentNow = DateTime.now();
                if (dateTime.year == currentNow.year &&
                    dateTime.month == currentNow.month &&
                    dateTime.day == currentNow.day &&
                    dateTime.isBefore(currentNow)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Cannot select a past time today!")),
                  );
                  return;
                }
                setState(() {
                  selectedDateTime = dateTime;
                  dateController.text = DateFormat("dd-MM-yyyy").format(dateTime);
                  timeController.text = DateFormat("hh:mm a").format(dateTime);
                  checkout.text = _formatDateTime(dateTime);
                  print("Selected Date: ${checkout.text}, Selected Time: ${timeController.text}");

                  // Add this line to refresh business hours check
                  if (selectedVendor != null) {
                    checkBusinessHours(selectedVendor!.id).then((_) {
                      checkIfVendorIsOpen(); // This will refresh the UI
                    });
                  }
                });
              },
              bottomPickerTheme: BottomPickerTheme.temptingAzure,
            ),
          ),
        );
      },
    );
  }
  @override
  Widget build(BuildContext context) {
    return _isLoading
        ? const LoadingGif() // Show loading GIF before the Scaffold
        :Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        // backgroundColor: ColorUtils.primarycolor(),
        title: Text(
          'Select Parking',
          style: GoogleFonts.poppins(color: Colors.black),
        ),
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: Padding(
        padding: const EdgeInsets.all(15.0),
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 15),

         Container(
                      height: 55,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: Colors.grey,
                          width: 0.5,
                        ), // Add a border
                        borderRadius:
                            BorderRadius.circular(5), // Circular border radius
                      ),
                      child: CustomDropdown<String?>(
                        hintText: 'Select Place',
                        items: [
                          widget.vendorName
                        ], // ✅ Only include the passed vendor name
                        controller: _parkingPlaceController,
                        onChanged: (String? value) {
                          print("Vendor selected: $value");
                          setState(() {
                            // print("Vendor selected: $value");
                            selectedVendor = widget.vendorId as Vendor?;


                            print(
                                "Selected Vendor: ${selectedVendor?.vendorName}, ID: ${selectedVendor?.id}"); // Debugging line
                          });
                        },
                      ),
                    ),

              const SizedBox(height: 15),
              isLoading
                  ? Center(
                child: Image.asset('assets/gifload.gif',height: 20,),
              )
                  : noVehiclesFound // Check if no vehicles are found
                  ? Column(
                children: [
                  const Text(
                    'No vehicles found. Please add a vehicle.',
                    style: TextStyle(fontSize: 14, color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Container(height: 30,
                    decoration: BoxDecoration(
                      color: Colors.blue, // Change this to match the button color
                      borderRadius: BorderRadius.circular(5), // Set border radius to 5
                    ),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        foregroundColor: Colors.white,
                        backgroundColor: ColorUtils.primarycolor(),// Makes button match container color
                        shadowColor: Colors.transparent, // Removes default button shadow
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5), // Ensures button follows border radius
                        ),
                      ),
                      onPressed: () {
                        // Navigate to the Add Vehicle page
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => AddMyCar(userId: widget.userId),
                          ),
                        );
                      },
                      child: const Text('Add Vehicle'),
                    ),
                  ),

                ],
              )
                  :Container(
                height: 55,
                decoration: BoxDecoration(
                  color: Colors.white, // Set background color to white
                  border: Border.all(color: Colors.grey, width: 0.5), // Add a border
                  borderRadius: BorderRadius.circular(5), // Circular border radius
                ),
                child: Row(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0), // Add some horizontal padding
                      child: Icon(
                        selectedCarType == 'Bike'
                            ? Icons.motorcycle
                            : selectedCarType == 'Car'
                            ? Icons.directions_car
                            : Icons.directions_transit, // Change icon based on vehicle type
                        size: 24,
                        color: Colors.black,
                      ),
                    ),
                    Expanded(
                      child: CustomDropdown<String?>(
                        hintText: 'Select Vehicle',
                        items: cars,
                        controller: carController,
                        onChanged: (String? value) {
                          if (!mounted) return; // Check if widget is mounted
                          setState(() {
                            carController.value = value;
                            if (value != null) {
                              selectedCarType = carTypeMap[value];
                              print("Selected Car Type: $selectedCarType");
                              charges = [];
                              charge = [];
                              if (selectedCarType != null) {
                                checkBusinessHours(widget.vendorId).then((_) {
                                  checkIfVendorIsOpen();
                                });
                                fetchmonth(selectedCarType!);
                                fetchChargesData(selectedCarType!);
                                fetchavailability(widget.vendorId, selectedCarType!);
                              } else {
                                print("Car type not found for selected vehicle");
                                charges = [];
                                charge = [];
                              }
                            }
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 15),
              if (selectedVendor != widget.vendorName && selectedCarType != null) ...[
                if (availableSlots == 0|| charges.isEmpty) ...[
                  const SizedBox(height: 15),
                  Text(
                    'This parking does not have or does not allow $selectedCarType parking',
                    style: const TextStyle(fontSize: 16, color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  // const SizedBox(height: 20),
                ],
              ] else ...[


              ],
              const SizedBox(height: 15),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal, // Enable horizontal scrolling
                child: Row(
                  children: List.generate(charges.length, (index) {
                    var charge = charges[index];
                    return Row(
                      children: [
                        Container(
                          width: 85, // Set width for each item
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4), // Reduce vertical padding
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                charge['type'],
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  height: 1.2, // Reduce line spacing
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 1), // Reduce space between text
                              Text(
                                "₹${charge['amount']}",
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 14,
                                  height: 1.2, // Reduce line spacing
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                        // Add a divider after each item except the last one
                        if (index < charges.length - 1)
                          const SizedBox(
                            width: 16, // Reduce spacing between items
                            height: 35, // Set height to match container's height
                            child: VerticalDivider(
                              color: Colors.grey,
                              thickness: 0.5,
                              width: 8, // Reduce space between items
                            ),
                          ),
                      ],
                    );
                  }),
                ),
              ),

              const SizedBox(height: 15),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Instant Option
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOption = 'Instant';
                        });
                        if (widget.vendorId != null && selectedCarType != null) {
                          checkBusinessHours(widget.vendorId).then((_) {
                            checkIfVendorIsOpen();
                          });
                        }
                      },
                      child: Container(
                        height: 55,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _selectedOption == 'Instant' ? ColorUtils.primarycolor() : Colors.white,
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(
                            color: Colors.grey,
                            width: 0.5,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.directions_car,
                              color: _selectedOption == 'Instant' ? Colors.white : ColorUtils.primarycolor(),
                            ),
                            const SizedBox(width: 5), // Space between icon and text
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Park',
                                  style: TextStyle(
                                    color: _selectedOption == 'Instant' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Instant' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9, // Reduces line spacing
                                  ),
                                ),
                                Text(
                                  'Now',
                                  style: TextStyle(
                                    color: _selectedOption == 'Instant' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Instant' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9, // Reduces line spacing
                                  ),
                                ),
                              ],
                            ),

                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(width: 10),
                  // Schedule Option
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOption = 'Schedule';
                        });
    if (widget.vendorId != null && selectedCarType != null) {
    checkBusinessHours(widget.vendorId).then((_) {
    checkIfVendorIsOpen();
    });
    }
                      },

                      child: Container(
                        height: 55,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _selectedOption == 'Schedule' ? ColorUtils.primarycolor() : Colors.white,
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(
                            color: Colors.grey,
                            width: 0.5, // Set border width to 0.5
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                                Icons.calendar_today,
                                color: _selectedOption == 'Schedule' ? Colors.white : ColorUtils.primarycolor()
                            ),
                            const SizedBox(width: 2),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Schedule',
                                  style: TextStyle(
                                    color: _selectedOption == 'Schedule' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Schedule' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9, // Adjust this value to control spacing
                                  ),
                                ),
                                Text(
                                  'For Later',
                                  style: TextStyle(
                                    color: _selectedOption == 'Schedule' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Schedule' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9, // Same as above for consistency
                                  ),
                                ),
                              ],
                            ),

                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  if (selectedVendor == null && selectedCarType == null) ...[
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedOption = 'Subscription';
                          });
                          if (widget.vendorId != null && selectedCarType != null) {
                            checkBusinessHours(widget.vendorId).then((_) {
                              checkIfVendorIsOpen();
                            });
                          }
                        },
                        child: SizedBox(
                          height: 55,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _selectedOption == 'Subscription' ? ColorUtils.primarycolor() : Colors.white,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: Colors.grey,
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                    Icons.calendar_month_outlined,
                                    color: _selectedOption == 'Subscription' ? Colors.white : ColorUtils.primarycolor()
                                ),
                                const SizedBox(width: 5),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Monthly',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                        fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                        height: 0.9, // Reduces line spacing
                                      ),
                                    ),
                                    if (charge.isNotEmpty) ...[
                                      Row(
                                        mainAxisSize: MainAxisSize.min, // Prevent extra spacing
                                        children: List.generate(charge.length, (index) {
                                          var chargeItem = charge[index];
                                          return Container(
                                            margin: const EdgeInsets.symmetric(horizontal: 2), // Adjust spacing between items
                                            child: Text(
                                              "₹${chargeItem['amount']}",
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                                fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                                height: 0.9, // Reduces line spacing
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          );
                                        }),
                                      ),
                                    ] else ...[
                                      Text(
                                        "Parking",
                                        style: TextStyle(
                                          color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                          height: 0.9, // Reduces line spacing
                                        ),
                                      ),
                                    ],
                                  ],
                                ),

                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                  // Subscription Option
                  if (charge.isNotEmpty && charge.any((c) => c['amount'] != "NA")) ...[
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedOption = 'Subscription';
                          });
                        },
                        child: SizedBox(
                          height: 55,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _selectedOption == 'Subscription' ? ColorUtils.primarycolor() : Colors.white,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: Colors.grey,
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.calendar_month_outlined,
                                    color: _selectedOption == 'Subscription' ? Colors.white : ColorUtils.primarycolor()
                                ),
                                const SizedBox(width: 5),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Monthly',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                        fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                        height: 0.9, // Reduces line spacing
                                      ),
                                    ),
                                    if (charge.isNotEmpty) ...[
                                      Row(
                                        mainAxisSize: MainAxisSize.min, // Prevent extra spacing
                                        children: List.generate(charge.length, (index) {
                                          var chargeItem = charge[index];
                                          return Container(
                                            margin: const EdgeInsets.symmetric(horizontal: 2), // Adjust spacing between items
                                            child: Text(
                                              "₹${chargeItem['amount']}",
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                                fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                                height: 0.9, // Reduces line spacing
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          );
                                        }),
                                      ),
                                    ] else ...[
                                      Text(
                                        "NA",
                                        style: TextStyle(
                                          color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                          height: 0.9, // Reduces line spacing
                                        ),
                                      ),
                                    ],
                                  ],
                                ),

                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 15),
              if (_selectedOption == 'Instant' || _selectedOption == 'Schedule')
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Hourly",
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: isHourly ? ColorUtils.primarycolor() : Colors.black,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 5),
                    AnimatedToggleSwitch<bool>.dual(
                      current: isHourly,
                      first: true, // Represents Hourly
                      second: false, // Represents 24 Hours
                      borderWidth: 1.0,
                      height: 24.0,
                      spacing: 15.0,
                      styleBuilder: (val) => ToggleStyle(
                        backgroundColor: Colors.white,
                        borderColor: Colors.grey.shade400,
                        indicatorColor: ColorUtils.primarycolor(), // Same color for both states
                      ),
                      onChanged: (val) {
                        setState(() {
                          isHourly = val;
                        });
                      },
                      iconBuilder: (val) => Icon(
                        val ? Icons.access_time : Icons.access_alarm,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      "Full day",
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: !isHourly ? ColorUtils.primarycolor() : Colors.black,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),

              const SizedBox(height: 20),

              if (_selectedOption == 'Schedule') ...[
                // const SizedBox(height: 15),
                CusTextField(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: subscriptionDateTimeController,
                  focusNode: _subscriptionFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.done,
                  inputFormatter: const [],
                  label: 'Select Parking Date & Time',
                  hint: 'Select Parking Date & Time',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 10.0, right: 5),
                    child:
                        Icon(Icons.calendar_today, size: 20, color: customTeal),
                  ),
                  readOnly: true,
                  onTap: () async {
                    _showDateTimePickerForSubscription(); // Opens the date-time picker
                  },
                ),
              ],

              if (_selectedOption == 'Subscription') ...[
                const SizedBox(height: 10),
              ],
              //
              if (_selectedOption == 'Subscription') ...[
                // const SizedBox(height: 1),
                CusTextField(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: subscriptionDateTimeController,
                  focusNode: _subscriptionFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.done,
                  inputFormatter: const [],
                  label: 'Starting Date ',
                  hint: 'Starting Date ',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 10.0, right: 5),
                    child:
                        Icon(Icons.calendar_today, size: 20, color: customTeal),
                  ),
                  readOnly: true,
                  onTap: () async {
                    _showDateTimePickerForSubscription();
                  },
                ),
              ],
              // Subscription Radio Button

              // const SizedBox(height: 10),

              if (_selectedOption == 'Instant') ...[
                greyfield(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: dateTimeController,
                  focusNode: _dateTimeFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.done,
                  inputFormatter: const [],
                  label: 'Select Parking Date & Time',
                  hint: 'Select Parking Date & Time',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 10.0, right: 5),
                    child: Icon(Icons.calendar_month_outlined,
                        size: 20, color: customTeal),
                  ),
                  readOnly: true,

                  // onTap: () async {
                  //   _showDateTimePicker(); // Opens the date-time picker
                  // },
                ),
              ],
              const SizedBox(height: 10),
              // Container(
              //   alignment: Alignment.centerLeft, // Aligns text to the left
              //   child: const Text(
              //     " Optional Information",
              //     style: TextStyle(
              //       color: Colors.black,
              //
              //       fontSize: 18,
              //     ),
              //   ),
              // ),
              const SizedBox(height: 10),
    if (_selectedOption != 'Subscription') ...[
              CusTextField(
                labelColor: customTeal,
                selectedColor: customTeal,
                controller: checkout,
                focusNode: _checkout,
                keyboard: TextInputType.text,
                obscure: false,
                textInputAction: TextInputAction.next,
                inputFormatter: const [],

                label: 'Tentitve checkout date & time (Optional)',
                hint: ' Tentitve checkout date & time (Optional)',
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(left: 10.0, right: 5),
                  child: Icon(Icons.calendar_month_outlined, color: customTeal),
                ), // Icon color for car
                readOnly: true,
                onTap: () async {
                  _tenditivecheckout(); // Opens the date-time picker
                },
              ),
              ],
              Align(
                alignment: Alignment.centerRight,
                child: Container(
                  child: IconButton(
                    onPressed: widget.vendorId != null ? () => _showOperationalTimingsBottomSheet() : null,
                    icon: const Icon(
                      Icons.info_outline,
                      color: Colors.grey,
                      size: 24,
                    ),
                    tooltip: 'View Operational Timings',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 10,
                      minHeight: 10,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              if (availableSlots == 0 || charges.isEmpty || !isVendorOpen) ...[
                // Show a message when no slots are available, no charges are found, or the vendor is closed
                Text(
                  !isVendorOpen
                      ? closedReason // Display the reason why the vendor is closed
                      : availableSlots == 0
                      ? 'No available slots for $selectedCarType parking'
                      : 'No charges available for $selectedCarType parking',
                  style: const TextStyle(fontSize: 16, color: Colors.red),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
              ] else ...[
                Align(
                  alignment: Alignment.bottomRight,
                  child: SizedBox(
                    width: 120,
                    height: 40,
                    child: ElevatedButton(
                      onPressed: _isLoading
                          ? null
                          : (_selectedOption == 'Subscription'
                          ? _payNow
                          : _registerParking), // 👈 choose action
                      style: ElevatedButton.styleFrom(
                        backgroundColor: customTeal,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                        width: 24.0,
                        height: 24.0,
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          strokeWidth: 2.0,
                        ),
                      )
                          : Align(
                        child: Text(
                          _selectedOption == 'Subscription' ? 'Pay Now' : 'Book Now', // 👈 choose text
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
  Widget _statusLabel(String label, Color color, {bool isSmallScreen = false}) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: 4, horizontal: isSmallScreen ? 4 : 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          label,
          style: TextStyle(
            fontSize: isSmallScreen ? 12 : 14,
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _styledBox(String value) {
    return Container(
      height: 30,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(4),
      ),
      alignment: Alignment.centerLeft,
      child: Text(
        value,
        style: const TextStyle(fontSize: 11, color: Colors.black87),
      ),
    );
  }
  void _showOperationalTimingsBottomSheet() {
    // Check if vendorId exists and fetch business hours if needed
    if (widget.vendorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No vendor selected')),
      );
      return;
    }

    // Check if business hours are available, if not, fetch them
    if (businessHours.isEmpty) {
      checkBusinessHours(widget.vendorId).then((_) {
        if (mounted) {
          _showOperationalTimingsBottomSheet(); // Retry after fetching
        }
      });
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: Colors.white,
      builder: (BuildContext context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Operational Timings',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          Text(
                            widget.vendorName ?? 'Unknown Vendor', // Use widget property
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Current Status
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isVendorOpen ? Colors.green.shade50 : Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isVendorOpen ? Colors.green.shade200 : Colors.red.shade200,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isVendorOpen ? Icons.check_circle : Icons.schedule,
                          color: isVendorOpen ? Colors.green : Colors.red,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isVendorOpen ? 'Open Now' : 'Closed',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: isVendorOpen
                                      ? Colors.green.shade700
                                      : Colors.red.shade700,
                                ),
                              ),
                              if (!isVendorOpen && closedReason.isNotEmpty)
                                Text(
                                  closedReason,
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Weekly Schedule Header
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        color: customTeal,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Weekly Schedule',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // Updated Schedule Table
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollController,
                      child: Column(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 14.0, vertical: 4.0),
                            child: Row(
                              children: [
                                Expanded(
                                    flex: 3,
                                    child: Text('Day', style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12))),
                                Expanded(
                                    flex: 3,
                                    child: Text('Open at', style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12))),
                                Expanded(
                                    flex: 3,
                                    child: Text('Close at', style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12))),
                              ],
                            ),
                          ),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: businessHours.length,
                            itemBuilder: (context, index) {
                              final dayData = businessHours[index];
                              return Container(
                                margin: const EdgeInsets.symmetric(
                                    horizontal: 4.0, vertical: 3.0),
                                padding: const EdgeInsets.all(4.0),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: const [
                                    BoxShadow(
                                        color: Colors.black12,
                                        blurRadius: 3,
                                        offset: Offset(0, 2))
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      flex: 3,
                                      child: Text(
                                        dayData.day,
                                        style: GoogleFonts.poppins(
                                          fontWeight: FontWeight.w500,
                                          fontSize: 12,
                                          color: Colors.black87,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 3,
                                      child: dayData.isClosed
                                          ? _statusLabel('Closed', Colors.red)
                                          : dayData.is24Hours
                                          ? _statusLabel('24 Hours', Colors.green)
                                          : _styledBox(dayData.openTime),
                                    ),
                                    if (!dayData.isClosed && !dayData.is24Hours)
                                      const SizedBox(width: 8.0),
                                    if (!dayData.isClosed && !dayData.is24Hours)
                                      Expanded(
                                        flex: 3,
                                        child: _styledBox(dayData.closeTime),
                                      ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            );
          },
        );
      },
    );
  }
}


class liveExploreBook extends StatefulWidget {
  final String userId;
  final String? selectedOption;
  final String? vendorId;
  final String? vendorName;

  const liveExploreBook({
    super.key,
    required this.userId,
    this.selectedOption,
    this.vendorId,
    this.vendorName,
  });

  @override
  _ChooseParkingPageState createState() => _ChooseParkingPageState();
}

class _ChooseParkingPageState extends State<liveExploreBook> {
  Color customTeal = ColorUtils.primarycolor();
  DateTime? selectedDateTime;
  String? _id;
  late Future<List<Vendor>> _vendors;
  String? _selectedVendor;
  bool isHourly = true;
  static const int minimumScheduleHours = 2; // Minimum hours for scheduling
  String? _selectedOption = 'Temporary';
  String? selectedParkingPlace;
  String? selectedCar;
  String? _selectedSubscriptionType; // Variable to store the selected subscription type
  List<String> cars = [];
  bool isLoading = false;
  Vendor? selectedVendor;
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double totalAmountWithTaxes = 0.0;
  double totalPayableAmount = 0.0;
  final TextEditingController dateTimeController = TextEditingController();
  final TextEditingController mobileController = TextEditingController();
  final TextEditingController nameController = TextEditingController();
  String? selectedCarType;
  final TextEditingController datTimeController = TextEditingController();
  final TextEditingController subscriptionController = TextEditingController();
  final TextEditingController dateeTimeController = TextEditingController();
  final TextEditingController CartypeController = TextEditingController();
  final TextEditingController dateController = TextEditingController();
  final TextEditingController timeController = TextEditingController();
  final TextEditingController checkout = TextEditingController();
  final TextEditingController subscriptionDateTimeController = TextEditingController();
  final FocusNode _checkout = FocusNode();
  final FocusNode _subscriptionFocusNode = FocusNode();

  final SingleSelectController<String?> carController = SingleSelectController(null);
  final SingleSelectController<String?> _parkingPlaceController = SingleSelectController(null);
  Map<String, String> carTypeMap = {}; // Map to store car model and its type

  List<dynamic> charges = [];
  List<dynamic> charge = [];
  int availableSlots = 0; // Declare this in your state class
  bool noVehiclesFound = false; // Add this variable to track if no vehicles are found
  DateTime? instantParkingDateTime;
  DateTime? scheduledParkingDateTime;
  DateTime? subscriptionParkingDateTime;
  final FocusNode _dateTimeFocusNode = FocusNode();
  late Timer _timer;
  bool _isLoading = false;
  List<BusinessHours> businessHours = [];
  bool isVendorOpen = false;
  String closedReason = "";
  String? dropdownValue; // Initial selected value
  String? _selectedCarType;

  final List<String> subscriptionOptions = [
    "Monthly Subscription",
  ];
  //hiiii
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
// Helper function to round up to nearest rupee
  double roundUpToNearestRupee(double amount) {
    return amount.ceilToDouble();
  }
  double calculateTotalWithTaxes(double payableAmount) {
    // Round up base amount first
    double roundedBaseAmount = roundUpToNearestRupee(payableAmount);

    // Calculate GST on the rounded base amount and round it up
    double gstAmount = (roundedBaseAmount * gstPercentage) / 100;
    double roundedGst = roundUpToNearestRupee(gstAmount);

    // Round up handling fee
    double roundedHandlingFee = roundUpToNearestRupee(handlingFee);

    // Calculate total by summing all rounded values
    totalAmountWithTaxes = roundedBaseAmount + roundedGst + roundedHandlingFee;

    return totalAmountWithTaxes;
  }
  Future<void> fetchmonth(String vendorId, String selectedCarType) async {
    setState(() {
      _isLoading = true; // Start loading
    });

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchmonth/$vendorId/$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        if (data is List) {
          setState(() {
            charge = List<Map<String, dynamic>>.from(data);
          });
        } else if (data['vendor'] != null && data['vendor']['charges'] != null) {
          setState(() {
            charge = List<Map<String, dynamic>>.from(data['vendor']['charges']);
          });
        } else {
          print('Charges data is missing or invalid in the response.');
          setState(() {
            charge = []; // Reset charges if data is invalid
          });
        }
      } else if (response.statusCode == 404) {
        print('No monthly charges found for the selected vendor and car type.');
        setState(() {
          charge = []; // Set charge to empty
        });
      } else {
        print('Failed to load charges data. Status Code: ${response.statusCode}');
        setState(() {
          charge = []; // Reset charges on failure
        });
      }
    } catch (e) {
      print('Error fetching charges data: $e');
      setState(() {
        charge = []; // Reset charges on error
      });
    } finally {
      setState(() {
        _isLoading = false; // Stop loading
      });
    }
  }

  Future<void> fetchChargesData(String vendorId, String selectedCarType) async {
    setState(() {
      _isLoading = true; // Start loading
    });

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchbookcharge/$vendorId/$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        if (data is List) {
          setState(() {
            charges = List<Map<String, dynamic>>.from(data);
          });
        } else if (data['vendor'] != null && data['vendor']['charges'] != null) {
          setState(() {
            charges = List<Map<String, dynamic>>.from(data['vendor']['charges']);
          });
        } else {
          print('Charges data is missing or invalid in the response.');
          setState(() {
            charges = []; // Reset charges if data is invalid
          });
        }
      } else {
        print('Failed to load charges no charges data. Status Code: ${response.statusCode}');
        setState(() {
          charges = []; // Reset charges on failure
        });
      }
    } catch (e) {
      print('Error fetching charges data: $e');
      setState(() {
        charges = []; // Reset charges on error
      });
    } finally {
      setState(() {
        _isLoading = false; // Stop loading
      });
    }
  }

  Future<void> fetchavailability(String vendorId, String selectedCarType) async {
    print('🔄 Fetching availability for:');
    print('Vendor ID: $vendorId');
    print('Vehicle Type: $selectedCarType');

    setState(() {
      _isLoading = true;
    });

    try {
      final url = '${ApiConfig.baseUrl}vendor/bookavailability?vendorId=$vendorId&vehicleType=$selectedCarType';
      print('🌐 API URL: $url');

      final response = await http.get(Uri.parse(url));

      print('📥 Response Status: ${response.statusCode}');
      print('📥 Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ Parsed JSON Data: $data');

        setState(() {
          availableSlots = data['availableSlots'] ?? 0;
        });

        print('✅ Available Slots Set: $availableSlots');
      } else {
        print('❌ Failed to load availability. Status Code: ${response.statusCode}');
        setState(() {
          availableSlots = 0;
        });
      }
    } catch (e) {
      print('⚠️ Error fetching availability: $e');
      setState(() {
        availableSlots = 0;
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
      print('✅ Loading Finished');
    }
  }

  Future<void> fetchCars(String userId) async {
    try {
      print('Fetching cars for userId: $userId');
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-vehicle?id=$userId'));

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        Map<String, dynamic> jsonResponse = json.decode(response.body);
        List<dynamic> vehiclesJson = jsonResponse['vehicles'] ?? [];
        setState(() {
          if (vehiclesJson.isEmpty) {
            noVehiclesFound = true;
          } else {
            noVehiclesFound = false;
            cars = vehiclesJson.map<String>((car) {
              final model = car['vehicleNo'] ?? 'Unknown Model';
              final vehicletype = car['type'] ?? 'No vehicle type';
              carTypeMap[model] = vehicletype;
              print('Vehicle Model: $model, Vehicle Type: $vehicletype');
              return model;
            }).toList();
          }
          isLoading = false;
        });
        print('Fetched cars: $cars');
      } else {
        throw Exception('Failed to load cars');
      }
    } catch (error) {
      print('Error fetching cars: $error');
      setState(() {
        isLoading = false;
        noVehiclesFound = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No Vehicles found..Add vehicle')),
      );
    }
  }

  List<Vendor> vendors = [];

  Future<void> _fetchUserData() async {
    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-userdata?id=${widget.userId}'));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['success'] && data['data'] != null) {
          setState(() {
            _user = User.fromJson(data['data']);
          });
          print('Fetched user data: ${data['data']}');
        } else {
          throw Exception(data['message']);
        }
      } else {
        throw Exception('Failed to load user data');
      }
    } catch (error) {
      print('Error fetching user data: $error');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load user data')),
      );
    }
  }

  User? _user;

  @override
  void initState() {
    super.initState();
    isLoading = true;
    if (_selectedOption == 'Instant') {
      checkIfVendorIsOpen();
    }

    _selectedOption = widget.selectedOption ?? 'Temporary';
    dropdownValue = subscriptionOptions.first;
    // _vendors = fetchVendors();
    fetchCars(widget.userId);
    final now = DateTime.now();
    datTimeController.text = _formatDateTime(now);
    dateTimeController.text = _getFormattedCurrentDateTime();
    selectedDateTime = now;
    _fetchUserData();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        dateTimeController.text = _getFormattedCurrentDateTime();
      });
    });
    if (widget.vendorId != null && selectedCarType != null) {
      checkBusinessHours(widget.vendorId!).then((_) {
        checkIfVendorIsOpen();
      });
    }

    fetchGstData().then((data) {
      setState(() {
        gstPercentage = double.tryParse(data['gst']?.toString() ?? '0') ?? 0.0;
        handlingFee = double.tryParse(data['handlingfee']?.toString() ?? '0') ?? 0.0;
      });
    }).catchError((e) {
      print('Error fetching GST data: $e');
      setState(() {
        gstPercentage = 0.0;
        handlingFee = 0.0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load tax details, proceeding without taxes')),
      );
    });

    dropdownValue = subscriptionOptions.first;
  }

  String _formatDateTime(DateTime dateTime) {
    return DateFormat("dd-MM-yyyy hh:mm a").format(dateTime);
  }


  String _getFormattedCurrentDateTime() {
    DateTime now = DateTime.now();
    DateFormat formatter = DateFormat('dd-MM-yyyy hh:mm a');
    return formatter.format(now);
  }

  void _showDateTimePickerForSubscription() {
    DateTime now = DateTime.now();
    DateTime minDateTime = DateTime(now.year, now.month, now.day, now.hour + minimumScheduleHours);

    DateTime initialDateTime = now.isBefore(minDateTime) ? minDateTime : now;

    BottomPicker.dateTime(
      initialDateTime: initialDateTime,
      minDateTime: minDateTime,
      maxDateTime: DateTime(2099, 12, 31),
      pickerTitle: Text(_formatDateTime(initialDateTime)),
      onSubmit: (dateTime) {
        DateTime currentNow = DateTime.now();
        if (dateTime.isBefore(currentNow.add(const Duration(hours: minimumScheduleHours)))) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Please select a time at least $minimumScheduleHours hour(s) in the future!")),
          );
          return;
        }
        setState(() {
          selectedDateTime = dateTime;
          subscriptionDateTimeController.text = _formatDateTime(dateTime);
          print("Selected Subscription Date: ${subscriptionDateTimeController.text}");

          // Add this line to refresh business hours check
          if (widget.vendorId != null) {
            checkBusinessHours(widget.vendorId!).then((_) {
              checkIfVendorIsOpen();
            });
          }
        });
      },
      bottomPickerTheme: BottomPickerTheme.temptingAzure,
    ).show(context);
  }
  void _tenditivecheckout() {
    DateTime now = DateTime.now();
    DateTime initialDateTime = now;

    BottomPicker.dateTime(
      initialDateTime: initialDateTime,
      minDateTime: DateTime(now.year, now.month, now.day),
      maxDateTime: DateTime(2099, 12, 31),
      pickerTitle: Text(_formatDateTime(initialDateTime)),
      onSubmit: (dateTime) {
        DateTime currentNow = DateTime.now();
        if (dateTime.year == currentNow.year &&
            dateTime.month == currentNow.month &&
            dateTime.day == currentNow.day &&
            dateTime.isBefore(currentNow)) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Cannot select a past time today!")),
          );
          return;
        }
        setState(() {
          selectedDateTime = dateTime;
          dateController.text = DateFormat("dd-MM-yyyy").format(dateTime);
          timeController.text = DateFormat("hh:mm a").format(dateTime);
          checkout.text = _formatDateTime(dateTime);
          print("Selected Date: ${checkout.text}, Selected Time: ${timeController.text}");

          // Add this line to refresh business hours check
          if (selectedVendor != null) {
            checkBusinessHours(selectedVendor!.id).then((_) {
              checkIfVendorIsOpen(); // This will refresh the UI
            });
          }
        });
      },
      bottomPickerTheme: BottomPickerTheme.temptingAzure,
    ).show(context);
  }

  @override
  void dispose() {
    _parkingPlaceController.dispose();
    carController.dispose();
    _timer.cancel();
    super.dispose();
  }
  Future<void> checkBusinessHours(String vendorId) async {
    try {
      print("🔄 Fetching business hours for vendorId: $vendorId");

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchbusinesshours/$vendorId'),
      );

      print("✅ Response status: ${response.statusCode}");
      print("📩 Raw response body: ${response.body}");

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print("📦 Decoded JSON: $data");

        setState(() {
          businessHours = (data['businessHours'] as List)
              .map((json) => BusinessHours.fromJson(json))
              .toList();

          print("⏰ Business hours parsed: $businessHours");

          // Check if vendor is currently open
          checkIfVendorIsOpen();
          print("🏪 Vendor open check triggered");
        });
      } else {
        print("⚠️ Failed to fetch business hours. Status code: ${response.statusCode}");
      }
    } catch (e) {
      print('❌ Error fetching business hours: $e');
    }
  }

  void checkIfVendorIsOpen() {
    if (widget.vendorId == null || businessHours.isEmpty) {
      setState(() {
        isVendorOpen = false;
        closedReason = ""; // Avoid showing any message
      });
      print("Vendor status: Skipped - No vendor selected or no business hours available");
      return;
    }

    // Determine which date to check based on the selected option
    DateTime checkDateTime;

    if (_selectedOption == 'Schedule' && selectedDateTime != null) {
      checkDateTime = selectedDateTime!;
    } else if (_selectedOption == 'Subscription' && selectedDateTime != null) {
      checkDateTime = selectedDateTime!;
    } else {
      // For Instant, always use the current time
      checkDateTime = DateTime.now();
    }

    final currentDay = DateFormat('EEEE').format(checkDateTime);
    final currentTime = DateFormat('HH:mm').format(checkDateTime);

    print("Checking vendor availability for: $currentDay at $currentTime");

    // Find the business hours for the selected/current day
    final todayHours = businessHours.firstWhere(
          (hours) => hours.day.toLowerCase() == currentDay.toLowerCase(),
      orElse: () => BusinessHours.empty(),
    );

    if (todayHours.day.isEmpty) {
      setState(() {
        isVendorOpen = false;
        closedReason = "Closed on $currentDay";
      });
      print("Vendor status: Closed - No business hours for $currentDay");
      return;
    }

    // Check if the day is completely closed
    if (todayHours.isClosed) {
      setState(() {
        isVendorOpen = false;
        closedReason = "Closed on $currentDay";
      });
      print("Vendor status: Closed - Entire day is closed");
      return;
    }

    // Check if it's 24 hours open
    if (todayHours.is24Hours) {
      setState(() {
        isVendorOpen = true;
        closedReason = "";
      });
      print("Vendor status: Open - 24 hours");
      return;
    }

    // Parse times for comparison
    final openTime = TimeOfDay(
      hour: int.parse(todayHours.openTime.split(':')[0]),
      minute: int.parse(todayHours.openTime.split(':')[1]),
    );

    final closeTime = TimeOfDay(
      hour: int.parse(todayHours.closeTime.split(':')[0]),
      minute: int.parse(todayHours.closeTime.split(':')[1]),
    );

    final currentTimeOfDay = TimeOfDay.fromDateTime(checkDateTime);

    final isOpen = (currentTimeOfDay.hour > openTime.hour ||
        (currentTimeOfDay.hour == openTime.hour &&
            currentTimeOfDay.minute >= openTime.minute)) &&
        (currentTimeOfDay.hour < closeTime.hour ||
            (currentTimeOfDay.hour == closeTime.hour &&
                currentTimeOfDay.minute <= closeTime.minute));

    setState(() {
      isVendorOpen = isOpen;
      closedReason = isOpen ? "" : "Closed at selected time. Opens at ${todayHours.openTime}";
    });

    print("Vendor status: ${isOpen ? 'Open' : 'Closed'} - Time-based check");
  }
  Future<void> _payNow() async {
    // Validate required fields

    if (selectedCarType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a vehicle type")),
      );
      return;
    }
    if (carController.value == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a Vehicle")),
      );
      return;
    }
    if (selectedDateTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a date and time")),
      );
      return;
    }
    if (_selectedOption == 'Subscription' && subscriptionDateTimeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a starting date for the subscription")),
      );
      return;
    }
    if (_selectedOption == 'Subscription' && charge.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("No subscription charges available for the selected vendor and vehicle type")),
      );
      return;
    }

    // Format the date and time
    String formattedDate = DateFormat("dd-MM-yyyy").format(selectedDateTime!);
    String formattedTime = DateFormat("hh:mm a").format(selectedDateTime!);
    DateTime now = DateTime.now();

    // Determine the amount based on the selected option
    String amount = '';
    String hour = '';
    if (_selectedOption == 'Subscription') {
      if (charge.isNotEmpty) {
        amount = charge[0]['amount']?.toString() ?? '0';
      }
    } else {
      if (charges.isNotEmpty) {
        amount = charges[0]['amount']?.toString() ?? '0';
        hour = charges[0]['type']?.toString() ?? '';
      }
    }

    // Calculate total amount with taxes
    double baseAmount = double.tryParse(amount) ?? 0.0;
    totalPayableAmount = calculateTotalWithTaxes(baseAmount);

    // Prepare data to pass to MonthlySub
    var data = {
      'userid': widget.userId,
      'place': widget.vendorName ?? '',
      'vehicleNumber': carController.value ?? '',
      'vendorName': widget.vendorName ?? '',
      'time': formattedTime,
      'vendorId': widget.vendorId ?? '',
      'bookingDate': DateFormat("dd-MM-yyyy").format(now),
      'parkingDate': formattedDate,
      'carType': _selectedCarType ?? '',
      'personName': _user?.username ?? '',
      'mobileNumber': _user?.mobileNumber ?? '',
      'sts': _selectedOption ?? 'Instant',
      'amount': amount,
      'hour': hour,
      'subscriptionType': _selectedSubscriptionType ?? '',
      'status': "PENDING",
      'vehicleType': selectedCarType ?? '',
      'parkingTime': formattedTime,
      'bookingTime': DateFormat("hh:mm a").format(now),
      'cancelledStatus': "",
      'bookType': isHourly ? 'Hourly' : '24 Hours',
      'gstPercentage': gstPercentage.toString(),
      'handlingFee': handlingFee.toString(),
      'totalAmountWithTaxes': totalPayableAmount.toString(),
    };

    // Navigate to MonthlySub with the data
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => monthlysub(
          totalamount: totalPayableAmount.toString(), // Pass total amount
          userId: data['userid']!,
          place: data['place']!,
          vehicleNumber: data['vehicleNumber']!,
          vendorName: data['vendorName']!,
          time: data['time']!,
          vendorId: data['vendorId']!,
          bookingDate: data['bookingDate']!,
          parkingDate: data['parkingDate']!,
          carType: data['carType']!,
          personName: data['personName']!,
          mobileNumber: data['mobileNumber']!,
          sts: data['sts']!,
          amount: data['amount']!,
          hour: data['hour']!,
          subscriptionType: data['subscriptionType']!,
          status: data['status']!,
          vehicleType: data['vehicleType']!,
          parkingTime: data['parkingTime']!,
          bookingTime: data['bookingTime']!,
          cancelledStatus: data['cancelledStatus']!,
          bookType: data['bookType']!,
          gstPercentage: data['gstPercentage']!, // Pass GST percentage
          handlingFee: data['handlingFee']!, // Pass handling fee
          totalAmountWithTaxes: data['totalAmountWithTaxes']!, // Pass total amount with taxes
        ),
      ),
    );
  }
  Future<void> _registerParking() async {
    if (carController.value == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a Vehicle")),
      );
      return;
    }

    if (_selectedOption == 'Schedule' || _selectedOption == 'Subscription') {
      if (selectedDateTime == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Please select a date and time")),
        );
        return;
      }
    }

    // Format the date and time
    String formattedDate = DateFormat("dd-MM-yyyy").format(selectedDateTime ?? DateTime.now());
    String formattedTime = DateFormat("hh:mm a").format(selectedDateTime ?? DateTime.now());
    DateTime now = DateTime.now();

    try {
      // Determine the amount based on the selected option
      String amount = '';
      String hour = '';
      if (_selectedOption == 'Subscription') {
        // Use the first item in the charge list for subscription amount
        if (charge.isNotEmpty) {
          amount = charge[0]['amount']?.toString() ?? '0';
        }
      } else {
        // For Instant or Schedule, use charges list if needed
        if (charges.isNotEmpty) {
          amount = charges[0]['amount']?.toString() ?? '0';
          hour = charges[0]['type']?.toString() ?? '';
        }
      }

      var data = {
        'userid': widget.userId,
        'place': widget.vendorName,
        'vehicleNumber': carController.value ?? '',
        "vendorName": widget.vendorName,
        'time': formattedTime,
        'vendorId': widget.vendorId,
        'bookingDate': DateFormat("dd-MM-yyyy").format(now),
        'parkingDate': formattedDate,
        'carType': selectedCarType ?? '',
        'personName': _user?.username ?? '',
        'mobileNumber': _user?.mobileNumber ?? '',
        'sts': _selectedOption ?? 'Instant',
        'amount': amount,
        'hour': hour,
        'subsctiptiontype': _selectedSubscriptionType ?? '',
        'status': "PENDING", // Default status
        'vehicleType': selectedCarType!,
        'parkingTime': formattedTime,
        'bookingTime': DateFormat("hh:mm a").format(now),
        'cancelledStatus': "",
        'bookType': isHourly ? 'Hourly' : '24 Hours',
        'tentativeCheckout': checkout.text, // Add tentative checkout time
      };

      // For Instant booking, call a different API and set status to PARKED
      if (_selectedOption == 'Instant') {
        data['status'] = 'PARKED';
        data['approvedDate'] = DateFormat("dd-MM-yyyy").format(now);
        data['approvedTime'] = DateFormat("hh:mm a").format(now);
        data['parkedDate'] = DateFormat("dd-MM-yyyy").format(now);
        data['parkedTime'] = DateFormat("hh:mm a").format(now);
      }

      // Debugging: Print the data being sent
      print('Sending data to server: $data');

      setState(() {
        _isLoading = true;
      });

      // Determine which API endpoint to use
      String apiEndpoint = _selectedOption == 'Instant'
          ? '${ApiConfig.baseUrl}vendor/livebooking'
          : '${ApiConfig.baseUrl}vendor/createbooking';

      var response = await http.post(
        Uri.parse(apiEndpoint),
        body: jsonEncode(data),
        headers: {"Content-Type": "application/json"},
      );

      String bookedDate = DateFormat("dd-MM-yyyy").format(now);
      String status = _selectedOption == 'Instant' ? 'PARKED' : 'PENDING';
      String schedule = formattedDate;

      // Debugging: Print the response status and body
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final String otp = responseData['otp'].toString();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Parking registered successfully!')),
        );

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => bookticket(
              bookingtype: (responseData['bookType'] ?? "").toString(),
              sts: (responseData['sts'] ?? "").toString(),
              otp: (responseData['otp'] ?? "").toString(),
              bookedid: _id ?? '',
              vehiclenumber: carController.value ?? '',
              vendorname: widget.vendorName ?? '',
              vendorid: widget.vendorId ?? '',
              parkingdate: formattedDate,
              parkingtime: formattedTime,
              vehicletype: selectedCarType ?? '',
              bookeddate: bookedDate,
              status: status,
              schedule: schedule,
            mobileno: _user?.mobileNumber ?? '',
              // approvedDate: _selectedOption == 'Instant'
              //     ? DateFormat("dd-MM-yyyy").format(now)
              //     : '',
              // approvedTime: _selectedOption == 'Instant'
              //     ? DateFormat("hh:mm a").format(now)
              //     : '',
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(' ${response.body}')),
        );
      }
    } catch (e) {
      print('Error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error connecting to server')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60.0),
        child: Container(
          decoration: const BoxDecoration(),
          child: AppBar(
            titleSpacing: 0,
            title: Text(
              'Book Parking',
              style: GoogleFonts.poppins(color: Colors.black, fontSize: 18),
            ),
            iconTheme: const IconThemeData(color: Colors.black),
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.only(left: 15.0, right: 15.0, bottom: 15.0),
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                height: 55,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey, width: 0.5),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: CustomDropdown<String?>(
                  hintText: widget.vendorName ?? 'Select Parking Place',
                  items: vendors.map((vendor) => vendor.vendorName).toList(),
                  controller: _parkingPlaceController,
                  onChanged: (String? value) {
                    setState(() {
                      selectedVendor = vendors.firstWhere(
                            (vendor) => vendor.vendorName == value,
                        orElse: () => Vendor(
                          status: 'approved',
                          id: widget.vendorId ?? '',
                          vendorName: value ?? widget.vendorName ?? '',
                          contacts: [],
                          latitude: '0',
                          longitude: '0',
                          address: '',
                          landMark: '',
                          image: '',
                          parkingEntries: [],
                          visibility: true,
                        ),
                      );

                      if (value != null && selectedCarType != null) {
                        checkIfVendorIsOpen();
                        fetchChargesData(widget.vendorId!, selectedCarType!);
                        fetchmonth(widget.vendorId!, selectedCarType!);
                        fetchavailability(widget.vendorId!, selectedCarType!);
                      }

                      print("Selected Vendor: ${widget.vendorName}, ID: ${widget.vendorId}");
                    });
                  },
                ),
              ),
              const SizedBox(height: 15),
              isLoading
                  ? Center(
                child: Image.asset('assets/gifload.gif', height: 20),
              )
                  : noVehiclesFound
                  ? Column(
                children: [
                  const Text(
                    'No vehicles found. Please add a vehicle.',
                    style: TextStyle(fontSize: 14, color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Container(
                    height: 30,
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        foregroundColor: Colors.white,
                        backgroundColor: ColorUtils.primarycolor(),
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => AddMyCar(userId: widget.userId),
                          ),
                        );
                      },
                      child: const Text('Add Vehicle'),
                    ),
                  ),
                ],
              )
                  : Container(
                height: 55,
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: Colors.grey, width: 0.5),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Row(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0),
                      child: Icon(
                        selectedCarType == 'Bike'
                            ? Icons.motorcycle
                            : selectedCarType == 'Car'
                            ? Icons.directions_car
                            : Icons.directions_transit,
                        size: 24,
                        color: Colors.black,
                      ),
                    ),

                    Expanded(
                      child: CustomDropdown<String?>(
                        hintText: 'Select Vehicle',
                        items: cars,
                        controller: carController,
                        onChanged: (String? value) {
                          setState(() {
                            carController.value = value;

                            if (value != null) {
                              selectedCarType = carTypeMap[value];
                              print('Selected Car Type: $selectedCarType');

                              charges = [];
                              charge = [];
                              if (widget.vendorName != null && widget.vendorId != null) {
                                // Ensure selectedDateTime is set for Instant mode
                                if (_selectedOption == 'Instant') {
                                  selectedDateTime = DateTime.now();
                                  dateTimeController.text = _formatDateTime(selectedDateTime!);
                                }

                                // Fetch business hours and check if vendor is open
                                checkBusinessHours(widget.vendorId!).then((_) {
                                  checkIfVendorIsOpen();
                                  // Fetch other data
                                  fetchChargesData(widget.vendorId!, selectedCarType!);
                                  fetchmonth(widget.vendorId!, selectedCarType!);
                                  fetchavailability(widget.vendorId!, selectedCarType!);
                                });
                              }
                            } else {
                              charges = [];
                              charge = [];
                              availableSlots = 0;
                              isVendorOpen = false;
                              closedReason = "";
                            }
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
              if (widget.vendorName != null && widget.vendorId != null && selectedCarType != null) ...[
                if (availableSlots == 0 || charges.isEmpty) ...[
                  const SizedBox(height: 15),
                  Text(
                    'This parking does not have or does not allow $selectedCarType parking',
                    style: const TextStyle(fontSize: 16, color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ],
              ] else ...[
                const SizedBox(height: 15),
                const Text(
                  'Please select a Vehicle',
                  style: TextStyle(fontSize: 16, color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 15),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(charges.length, (index) {
                    var charge = charges[index];
                    return Row(
                      children: [
                        Container(
                          width: 85,
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                charge['type'],
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  height: 1.2,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 1),
                              Text(
                                "₹${charge['amount']}",
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 14,
                                  height: 1.2,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                        if (index < charges.length - 1)
                          const SizedBox(
                            width: 16,
                            height: 35,
                            child: VerticalDivider(
                              color: Colors.grey,
                              thickness: 0.5,
                              width: 8,
                            ),
                          ),
                      ],
                    );
                  }),
                ),
              ),
              const SizedBox(height: 5),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOption = 'Instant';
                        });
                        if (widget.vendorId != null && selectedCarType != null) {
                          checkBusinessHours(selectedVendor!.id).then((_) {
                            checkIfVendorIsOpen();
                          });
                        }
                      },

                      /////////////
                      child: Container(
                        height: 55,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _selectedOption == 'Instant' ? ColorUtils.primarycolor() : Colors.white,
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(
                            color: Colors.grey,
                            width: 0.5,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.directions_car,
                              color: _selectedOption == 'Instant' ? Colors.white : ColorUtils.primarycolor(),
                            ),
                            const SizedBox(width: 5),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Park',
                                  style: TextStyle(
                                    color: _selectedOption == 'Instant' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Instant' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9,
                                  ),
                                ),
                                Text(
                                  'Now',
                                  style: TextStyle(
                                    color: _selectedOption == 'Instant' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Instant' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOption = 'Schedule';
                        });
                        if (widget.vendorId != null && selectedCarType != null) {
                          checkBusinessHours(selectedVendor!.id).then((_) {
                            checkIfVendorIsOpen();
                          });
                        }
                      },
                      child: Container(
                        height: 55,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _selectedOption == 'Schedule' ? ColorUtils.primarycolor() : Colors.white,
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(
                            color: Colors.grey,
                            width: 0.5,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.calendar_today,
                              color: _selectedOption == 'Schedule' ? Colors.white : ColorUtils.primarycolor(),
                            ),
                            const SizedBox(width: 2),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Schedule',
                                  style: TextStyle(
                                    color: _selectedOption == 'Schedule' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Schedule' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9,
                                  ),
                                ),
                                Text(
                                  'For Later',
                                  style: TextStyle(
                                    color: _selectedOption == 'Schedule' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Schedule' ? FontWeight.bold : FontWeight.normal,
                                    height: 0.9,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  if (widget.vendorName == null || widget.vendorId == null || selectedCarType == null) ...[
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedOption = 'Subscription';
                          });
                          if (widget.vendorId != null && selectedCarType != null) {
                            checkBusinessHours(selectedVendor!.id).then((_) {
                              checkIfVendorIsOpen();
                            });
                          }
                        },
                        child: SizedBox(
                          height: 55,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _selectedOption == 'Subscription' ? ColorUtils.primarycolor() : Colors.white,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: Colors.grey,
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.calendar_month_outlined,
                                  color: _selectedOption == 'Subscription' ? Colors.white : ColorUtils.primarycolor(),
                                ),
                                const SizedBox(width: 5),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Monthly',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                        fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                        height: 0.9,
                                      ),
                                    ),
                                    if (charge.isNotEmpty) ...[
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: List.generate(charge.length, (index) {
                                          var chargeItem = charge[index];
                                          return Container(
                                            margin: const EdgeInsets.symmetric(horizontal: 2),
                                            child: Text(
                                              "₹${chargeItem['amount']}",
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                                fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                                height: 0.9,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          );
                                        }),
                                      ),
                                    ] else ...[
                                      Text(
                                        "Parking",
                                        style: TextStyle(
                                          color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                          height: 0.9,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                  if (charge.isNotEmpty && charge.any((c) => c['amount'] != "NA")) ...[
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedOption = 'Subscription';
                          });
                        },
                        child: SizedBox(
                          height: 55,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _selectedOption == 'Subscription' ? ColorUtils.primarycolor() : Colors.white,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: Colors.grey,
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.calendar_month_outlined,
                                  color: _selectedOption == 'Subscription' ? Colors.white : ColorUtils.primarycolor(),
                                ),
                                const SizedBox(width: 5),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Monthly',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                        fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                        height: 0.9,
                                      ),
                                    ),
                                    if (charge.isNotEmpty) ...[
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: List.generate(charge.length, (index) {
                                          var chargeItem = charge[index];
                                          return Container(
                                            margin: const EdgeInsets.symmetric(horizontal: 2),
                                            child: Text(
                                              "₹${chargeItem['amount']}",
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                                fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal,
                                                height: 0.9,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          );
                                        }),
                                      ),
                                    ] else ...[
                                      Text(
                                        "NA",
                                        style: TextStyle(
                                          color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                          height: 0.9,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 15),
              if (_selectedOption == 'Instant' || _selectedOption == 'Schedule')
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Hourly",
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: isHourly ? ColorUtils.primarycolor() : Colors.black,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 5),
                    AnimatedToggleSwitch<bool>.dual(
                      current: isHourly,
                      first: true,
                      second: false,
                      borderWidth: 1.0,
                      height: 24.0,
                      spacing: 15.0,
                      styleBuilder: (val) => ToggleStyle(
                        backgroundColor: Colors.white,
                        borderColor: Colors.grey.shade400,
                        indicatorColor: ColorUtils.primarycolor(),
                      ),
                      onChanged: (val) {
                        setState(() {
                          isHourly = val;
                        });
                      },
                      iconBuilder: (val) => Icon(
                        val ? Icons.access_time : Icons.access_alarm,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      "Full day",
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: !isHourly ? ColorUtils.primarycolor() : Colors.black,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 15),
              if (_selectedOption == 'Schedule') ...[
                CusTextField(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: subscriptionDateTimeController,
                  focusNode: _subscriptionFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.done,
                  inputFormatter: const [],
                  label: 'Select Parking Date & Time',
                  hint: 'Select Parking Date & Time',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 10.0, right: 5),
                    child: Icon(Icons.calendar_today, size: 14, color: customTeal),
                  ),
                  readOnly: true,
                  onTap: () async {
                    _showDateTimePickerForSubscription();
                  },
                ),
              ],
              if (_selectedOption == 'Subscription') ...[
                CusTextField(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: subscriptionDateTimeController,
                  focusNode: _subscriptionFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.done,
                  inputFormatter: const [],
                  label: 'Starting Date ',
                  hint: 'Starting Date ',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 10.0, right: 5),
                    child: Icon(Icons.calendar_today, size: 14, color: customTeal),
                  ),
                  readOnly: true,
                  onTap: () async {
                    _showDateTimePickerForSubscription();
                  },
                ),
              ],
              if (_selectedOption == 'Instant') ...[
                greyfield(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: dateTimeController,
                  focusNode: _dateTimeFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.done,
                  inputFormatter: const [],
                  label: 'Select Parking Date & Time',
                  hint: 'Select Parking Date & Time',
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 10.0, right: 5),
                    child: Icon(Icons.calendar_month_outlined, size: 14, color: customTeal),
                  ),
                  readOnly: true,
                ),
              ],
              const SizedBox(height: 10),
    if (_selectedOption != 'Subscription') ...[
              CusTextField(
                labelColor: customTeal,
                selectedColor: customTeal,
                controller: checkout,
                focusNode: _checkout,
                keyboard: TextInputType.text,
                obscure: false,
                textInputAction: TextInputAction.next,
                inputFormatter: const [],
                label: 'Tentative checkout date & time (Optional)',
                hint: 'Tentative checkout date & time (Optional)',
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(left: 10.0, right: 5),
                  child: Icon(Icons.calendar_month_outlined, size: 14, color: customTeal),
                ),
                readOnly: true,
                onTap: () async {
                  _tenditivecheckout();
                },
              ),
              ],
              Align(
                alignment: Alignment.centerRight,
                child: Container(
                  child: IconButton(
                    onPressed: widget.vendorId != null ? () => _showOperationalTimingsBottomSheet() : null,
                    icon: const Icon(
                      Icons.info_outline,
                      color: Colors.grey,
                      size: 24,
                    ),
                    tooltip: 'View Operational Timings',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 10,
                      minHeight: 10,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              if (availableSlots == 0 || charges.isEmpty || !isVendorOpen) ...[
                // Show a message when no slots are available, no charges are found, or the vendor is closed
                Text(
                  !isVendorOpen
                      ? closedReason // Display the reason why the vendor is closed
                      : availableSlots == 0
                      ? 'No available slots for $selectedCarType parking'
                      : 'No charges available for $selectedCarType parking',
                  style: const TextStyle(fontSize: 16, color: Colors.red),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
              ] else ...[
                Align(
                  alignment: Alignment.bottomRight,
                  child: SizedBox(
                    width: 120,
                    height: 40,
                    child: ElevatedButton(
                      onPressed: _isLoading
                          ? null
                          : (_selectedOption == 'Subscription'
                          ? _payNow
                          : _registerParking), // 👈 choose action
                      style: ElevatedButton.styleFrom(
                        backgroundColor: customTeal,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                        width: 24.0,
                        height: 24.0,
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          strokeWidth: 2.0,
                        ),
                      )
                          : Align(
                        child: Text(
                          _selectedOption == 'Subscription' ? 'Pay Now' : 'Book Now', // 👈 choose text
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
  Widget _statusLabel(String label, Color color, {bool isSmallScreen = false}) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: 4, horizontal: isSmallScreen ? 4 : 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          label,
          style: TextStyle(
            fontSize: isSmallScreen ? 12 : 14,
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _styledBox(String value) {
    return Container(
      height: 30,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(4),
      ),
      alignment: Alignment.centerLeft,
      child: Text(
        value,
        style: const TextStyle(fontSize: 11, color: Colors.black87),
      ),
    );
  }
  void _showOperationalTimingsBottomSheet() {
    print('🔍 _showOperationalTimingsBottomSheet called');
    print('📍 widget.vendorId: ${widget.vendorId}');
    print('📋 businessHours.length: ${businessHours.length}');
    print('🏪 businessHours: $businessHours');

    // Check if vendorId exists
    if (widget.vendorId == null) {
      print('❌ Vendor ID is null');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No vendor selected')),
      );
      return;
    }

    // Check if business hours are available, if not, fetch them
    if (businessHours.isEmpty) {
      print('⏳ Business hours empty, fetching...');
      _isLoading = true;
      checkBusinessHours(widget.vendorId!).then((_) {
        if (mounted) {
          print('✅ Business hours fetched, retrying bottom sheet');
          _showOperationalTimingsBottomSheet();
        }
      }).catchError((error) {
        print('❌ Error fetching business hours: $error');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load operational timings')),
        );
      });
      return;
    }

    print('🎉 Showing bottom sheet with ${businessHours.length} business hours');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: Colors.white,
      builder: (BuildContext context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Operational Timings',
                              style: GoogleFonts.poppins(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                            Text(
                              widget.vendorName ?? 'Unknown Vendor',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Current Status
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isVendorOpen ? Colors.green.shade50 : Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isVendorOpen ? Colors.green.shade200 : Colors.red.shade200,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isVendorOpen ? Icons.check_circle : Icons.schedule,
                          color: isVendorOpen ? Colors.green : Colors.red,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isVendorOpen ? 'Open Now' : 'Closed',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: isVendorOpen
                                      ? Colors.green.shade700
                                      : Colors.red.shade700,
                                ),
                              ),
                              if (!isVendorOpen && closedReason.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4.0),
                                  child: Text(
                                    closedReason,
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Weekly Schedule Header
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        color: customTeal,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Weekly Schedule',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // Updated Schedule Table
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollController,
                      child: Column(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 14.0, vertical: 4.0),
                            child: Row(
                              children: [
                                Expanded(
                                    flex: 3,
                                    child: Text('Day',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12))),
                                Expanded(
                                    flex: 3,
                                    child: Text('Open at',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12))),
                                Expanded(
                                    flex: 3,
                                    child: Text('Close at',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12))),
                              ],
                            ),
                          ),
                          if (businessHours.isEmpty)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.all(20.0),
                                child: Text(
                                  'No business hours available',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey,
                                  ),
                                ),
                              ),
                            )
                          else
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: businessHours.length,
                              itemBuilder: (context, index) {
                                final dayData = businessHours[index];
                                return Container(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 4.0, vertical: 3.0),
                                  padding: const EdgeInsets.all(4.0),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: const [
                                      BoxShadow(
                                          color: Colors.black12,
                                          blurRadius: 3,
                                          offset: Offset(0, 2))
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        flex: 3,
                                        child: Text(
                                          dayData.day,
                                          style: GoogleFonts.poppins(
                                            fontWeight: FontWeight.w500,
                                            fontSize: 12,
                                            color: Colors.black87,
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        flex: 3,
                                        child: dayData.isClosed
                                            ? _statusLabel('Closed', Colors.red)
                                            : dayData.is24Hours
                                            ? _statusLabel('24 Hours', Colors.green)
                                            : _styledBox(dayData.openTime),
                                      ),
                                      if (!dayData.isClosed && !dayData.is24Hours)
                                        const SizedBox(width: 8.0),
                                      if (!dayData.isClosed && !dayData.is24Hours)
                                        Expanded(
                                          flex: 3,
                                          child: _styledBox(dayData.closeTime),
                                        ),
                                    ],
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            );
          },
        );
      },
    ).then((_) {
      print('📱 Bottom sheet closed');
    }).catchError((error) {
      print('❌ Error showing bottom sheet: $error');
    });
  }
}

class Vendor {
  final String status;
  final String id;
  final String vendorName;
  final List<Contact> contacts;
  final String latitude;
  final String longitude;
  final String address;
  final String landMark;
  final String image;
  double? distance;
  final List<ParkingEntry> parkingEntries;
  final bool visibility;

  Vendor({
    required this.status,
    required this.id,
    required this.vendorName,
    required this.contacts,
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.landMark,
    required this.image,
    required this.parkingEntries,
    this.distance,
    required this.visibility,
  });

  Vendor copyWith({
    String? status,
    String? id,
    String? vendorName,
    String? address,
    String? landMark,
    String? image,
    String? latitude,
    String? longitude,
    List<Contact>? contacts,
    List<ParkingEntry>? parkingEntries,
    double? distance,
    bool? visibility,
  }) {
    return Vendor(
      status: status ?? this.status,
      id: id ?? this.id,
      vendorName: vendorName ?? this.vendorName,
      address: address ?? this.address,
      landMark: landMark ?? this.landMark,
      image: image ?? this.image,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      contacts: contacts ?? this.contacts,
      parkingEntries: parkingEntries ?? this.parkingEntries,
      distance: distance ?? this.distance,
      visibility: visibility ?? this.visibility,
    );
  }

  factory Vendor.fromJson(Map<String, dynamic> json) {
    return Vendor(
      status: json['status'] ?? '',
      id: json['_id'] ?? '',
      vendorName: json['vendorName'] ?? '',
      contacts: (json['contacts'] as List? ?? []).map((contactJson) => Contact.fromJson(contactJson)).toList(),
      latitude: json['latitude']?.toString() ?? '0',
      longitude: json['longitude']?.toString() ?? '0',
      address: json['address'] ?? '',
      landMark: json['landMark'] ?? '',
      image: json['image'] ?? '',
      parkingEntries: (json['parkingEntries'] as List? ?? []).map((parkingEntryJson) => ParkingEntry.fromJson(parkingEntryJson)).toList(),
      visibility: json['visibility'] ?? false,
    );
  }
}

class Contact {
  final String name;
  final String mobile;

  Contact({
    required this.name,
    required this.mobile,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      name: json['name'],
      mobile: json['mobile'],
    );
  }
}

class ParkingEntry {
  // Define the structure based on your data
  factory ParkingEntry.fromJson(Map<String, dynamic> json) {
    // Implement based on your parkingEntries structure
    throw UnimplementedError('ParkingEntry.fromJson not implemented');
  }
}

