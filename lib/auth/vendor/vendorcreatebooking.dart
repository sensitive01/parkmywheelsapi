import 'dart:async';
import 'package:animated_toggle_switch/animated_toggle_switch.dart';
import 'package:bottom_picker/bottom_picker.dart';
import 'package:bottom_picker/resources/arrays.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mywheels/auth/customer/addcarviewcar/mycars.dart';
import 'package:mywheels/auth/vendor/vendordash.dart';
import 'package:mywheels/config/authconfig.dart';
import 'package:mywheels/config/colorcode.dart';
import 'package:http/http.dart' as http;
import 'package:mywheels/pageloader.dart';
import 'dart:convert';
import '../customer/parking/bookparking.dart';
import 'menus/parkingchart.dart';


class vendorChooseParkingPage extends StatefulWidget {
  final String vendorid;

  const vendorChooseParkingPage({super.key, required this.vendorid});

  @override
  _ChooseParkingPageState createState() => _ChooseParkingPageState();
}
class _ChooseParkingPageState extends State<vendorChooseParkingPage> {
  Color customTeal = ColorUtils.primarycolor();
  DateTime? selectedDateTime;
  String? _selectedSubscriptionType; // Variable to store the selected subscription type
  String? _selectedOption = 'Instant';
  late Future<List<Car>> _futureCars;
  String? _vendorName;
  late Future<List<Vendor>> _vendors;
  String? _selectedVendor;
  Vendor? _vendor;
  List<String> cate = ["Car", "Bike", "Others"];
  Map<String, dynamic>? _availableSlots;
  bool _isCheckingSlots = false;
  Future<void> _fetchVendorData() async {
    try {
      print('Fetching data for vendor ID: ${widget.vendorid}');

      final response = await http.get(
          Uri.parse('${ApiConfig.baseUrl}vendor/fetch-vendor-data?id=${widget.vendorid}')
      );

      print('Response Status Code: ${response.statusCode}');
      print('Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        print('Parsed Response Data: $data');

        // Here we assume the response is structured as you showed
        // Check if 'data' is present and not null
        if (data['data'] != null) {
          setState(() {
            _vendor = Vendor.fromJson(data['data']);
            // Store vendor name if needed
            _vendorName = data['data']['vendorName']; // Add this line
          });
        } else {
          // If 'data' is null, throw an exception with the message from the API
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception('Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      print('Error fetching vendor ccreate data: $error');

      // Display a user-friendly error message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load vendor data. Please try again later.')),
      );
    }
  }
  List<ParkingCharge> charges = [];
  int _selectedIndex = 0;
  String? selectedParkingPlace;
  String? selectedCar;
  Future<void> _fetchAvailableSlots() async {
    setState(() {
      _isCheckingSlots = true;
    });

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/availableslots/${widget.vendorid}'),
      );

      if (response.statusCode == 200) {
        setState(() {
          _availableSlots = json.decode(response.body);
        });
      } else {
        throw Exception('Failed to load available slots');
      }
    } catch (e) {
      print('Error fetching available slots: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error checking available slots')),
      );
    } finally {
      setState(() {
        _isCheckingSlots = false;
      });
    }
  }
  Future<List<ParkingCharge>> fetchParkingCharges(String vendorId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId'); // Replace with your actual API URL

    try {
      final response = await http.get(url);

      // Print response status and body for debugging
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        // Print the decoded JSON to check the structure
        print('Decoded JSON: $data');

        // Check if the 'vendor' object and its 'charges' field exist
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingCharge> charges = List<ParkingCharge>.from(
            data['vendor']['charges'].map((item) => ParkingCharge.fromJson(item)),
          );

          // Print the charges list to verify it's populated
          print('Charges: $charges');

          return charges;
        } else {
          throw Exception('Charges data not found');
        }
      } else {
        throw Exception('Failed to load parking charges');
      }
    } catch (e) {
      // Print the error message for debugging
      print('Error: $e');
      throw Exception('Error fetching data: $e');
    }
  }
  bool isHourly = true;
  List<String> cars = [];
  bool isLoading = false;
  final TextEditingController mobileController = TextEditingController();
  final TextEditingController nameController = TextEditingController();
  final TextEditingController carController = TextEditingController();
  final TextEditingController dateTimeController = TextEditingController();
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
  final FocusNode _dateeTimeFocusNode = FocusNode();
  final FocusNode _CartypeFocusNode = FocusNode();
  final FocusNode _nameFocusNode = FocusNode();
  final FocusNode _mobileFocusNode = FocusNode();
  final FocusNode _carFocusNode = FocusNode();
  final FocusNode _dateTimeFocusNode = FocusNode();
  late Timer _timer;
  final String apiUrl = '${ApiConfig.baseUrl}get-slot-details-vendor';
  bool _isLoading=false;
  String? _selectedSubscription;
  String? dropdownValue;
  final List<String> subscriptionOptions = [
    "Weekly Subscription",
    "Monthly Subscription",

    // Add more options as needed
  ];

  @override
  void initState() {
    super.initState();
    _fetchVendorData();
    _fetchAvailableSlots();
    fetchParkingCharges(widget.vendorid).then((fetchedCharges) {
      setState(() {
        charges = fetchedCharges;
        isLoading = false; // Update to stop loading spinner
      });
    }).catchError((e) {
      print('Error fetching charges: $e');
      setState(() {
        isLoading = false; // Stop loading spinner even on error
      });
    });
    _vendors = fetchVendors();
    _futureCars = ApiService().fetchCars(widget.vendorid);
    final now = DateTime.now();
    datTimeController.text = _formatDateTime(now);
    dateTimeController.text = _getFormattedCurrentDateTime();
    selectedDateTime = now;
    _setSelectedIndex("Car");
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      // Update the controller with the new formatted date and time every second
      setState(() {
        dateTimeController.text = _getFormattedCurrentDateTime();
      });
    });
    dropdownValue = subscriptionOptions.first;
  }

  // Function to get the current date and time formatted as "yyyy-MM-dd hh:mm:ss a"
  String _getFormattedCurrentDateTime() {
    DateTime now = DateTime.now();
    DateFormat formatter = DateFormat('yyyy-MM-dd hh:mm a'); // 12-hour format with AM/PM
    return formatter.format(now);
  }
  void _setSelectedIndex(String value) {
    setState(() {
      _selectedIndex = cate.indexOf(value);
    });
  }
  // String _getFormattedCurrentDateTime() {
  //   DateTime now = DateTime.now();
  //   DateFormat formatter = DateFormat('yyyy-MM-dd hh:mm:ss a');
  //   return formatter.format(now);
  // }
  void _showDateTimePicker() {
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
              minDateTime: DateTime(now.year, now.month, now.day), // Allow today's date
              maxDateTime: DateTime(2099, 12, 31),
              pickerTitle: Text(_formatDateTime(initialDateTime)),
              onSubmit: (dateTime) {
                DateTime currentNow = DateTime.now(); // Refresh the current time
                if (dateTime.year == currentNow.year &&
                    dateTime.month == currentNow.month &&
                    dateTime.day == currentNow.day &&
                    dateTime.isBefore(currentNow)) {
                  // Restrict past times only on the current day
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Cannot select a past time today!")),
                  );
                  return;
                }
                setState(() {
                  selectedDateTime = dateTime;
                  dateController.text = DateFormat("dd-MM-yyyy").format(dateTime); // Set date
                  timeController.text = DateFormat("hh:mm a").format(dateTime); // Set time
                  datTimeController.text = _formatDateTime(dateTime); // Set date and time in the text box

                  // Update the correct controller based on selected option
                  if (_selectedOption == 'Schedule') {
                    dateeTimeController.text = _formatDateTime(dateTime); // Set for scheduled parking
                  } else if (_selectedOption == 'Instant') {
                    dateTimeController.text = _formatDateTime(dateTime); // Set for instant parking
                  }

                  print("Selected Date: ${dateController.text}, Selected Time: ${timeController.text}"); // Debugging line
                });
              },
              bottomPickerTheme: BottomPickerTheme.temptingAzure,
            ),
          ),
        );
      },
    );
  }
  void _showDateTimePickerForSubscription() {
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
              minDateTime: DateTime(now.year, now.month, now.day), // Allow today's date
              maxDateTime: DateTime(2099, 12, 31),
              pickerTitle: Text(_formatDateTime(initialDateTime)),
              onSubmit: (dateTime) {
                DateTime currentNow = DateTime.now(); // Refresh the current time
                if (dateTime.year == currentNow.year &&
                    dateTime.month == currentNow.month &&
                    dateTime.day == currentNow.day &&
                    dateTime.isBefore(currentNow)) {
                  // Restrict past times only on the current day
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Cannot select a past time today!")),
                  );
                  return;
                }
                setState(() {
                  selectedDateTime = dateTime;
                  subscriptionDateTimeController.text = _formatDateTime(dateTime); // Set for subscription
                  print("Selected Subscription Date: ${subscriptionDateTimeController.text}"); // Debugging line
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
              minDateTime: DateTime(now.year, now.month, now.day), // Allow today's date
              maxDateTime: DateTime(2099, 12, 31),
              pickerTitle: Text(_formatDateTime(initialDateTime)),
              onSubmit: (dateTime) {
                DateTime currentNow = DateTime.now(); // Refresh the current time
                if (dateTime.year == currentNow.year &&
                    dateTime.month == currentNow.month &&
                    dateTime.day == currentNow.day &&
                    dateTime.isBefore(currentNow)) {
                  // Restrict past times only on the current day
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Cannot select a past time today!")),
                  );
                  return;
                }
                setState(() {
                  selectedDateTime = dateTime;
                  dateController.text = DateFormat("dd-MM-yyyy").format(dateTime); // Set date
                  timeController.text = DateFormat("hh:mm a").format(dateTime); // Set time
                  checkout.text = _formatDateTime(dateTime); // Set date and time in the text box
                  print("Selected Date: ${checkout.text}, Selected Time: ${timeController.text}"); // Debugging line
                });
              },
              bottomPickerTheme: BottomPickerTheme.temptingAzure,
            ),
          ),
        );
      },
    );
  }





  // Helper function to format date (day, month, year) and time (hour, minute, AM/PM)
  String _formatDateTime(DateTime dateTime) {
    return DateFormat("dd-MM-yyyy hh:mm a").format(dateTime);  // Full date + time with AM/PM
  }
  Future<List<Car>> fetchCars(String userId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-vehicle?id=$userId'));

    if (response.statusCode == 200) {
      Map<String, dynamic> jsonResponse = json.decode(response.body);
      List<dynamic> vehiclesJson = jsonResponse['vehicles'] ?? [];
      return vehiclesJson.map((car) => Car.fromJson(car)).toList();
    } else {
      throw Exception('Failed to load cars');
    }
  }
  Future<List<Vendor>> fetchVendors() async {
    try {
      final response = await http.get(Uri.parse(apiUrl));
      if (response.statusCode == 200) {
        Map<String, dynamic> data = json.decode(response.body);
        List<dynamic> vendorData = data['vendorData'];
        List<Vendor> vendors = vendorData.map((json) => Vendor.fromJson(json)).toList();
        return vendors;
      } else {
        throw Exception('Failed to load vendors');
      }
    } catch (e) {
      print('Error fetching vendors: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error fetching vendor create booking')),
      );
      throw Exception('Failed to load vendors');
    }
  }




  void _registerParking() async {
    // First check if we have slot data
    if (_availableSlots == null) {
      _showError('Unable to check parking availability. Please try again.');
      return;
    }

    // Determine vehicle type
    String vehicleType;
    switch (_selectedIndex) {
      case 0:
        vehicleType = 'Car';
        break;
      case 1:
        vehicleType = 'Bike';
        break;
      case 2:
        vehicleType = 'Others';
        break;
      default:
        vehicleType = 'Unknown';
    }

    // Check available slots
    int available = 0;
    if (vehicleType == 'Car') {
      available = _availableSlots!['Cars'] ?? 0;
    } else if (vehicleType == 'Bike') {
      available = _availableSlots!['Bikes'] ?? 0;
    } else {
      available = _availableSlots!['Others'] ?? 0;
    }

    if (available <= 0) {
      _showError('No space available for $vehicleType. Please try another vehicle type or check back later.');
      return;
    }

    // Validation for empty fields
    if (carController.text.isEmpty) {
      _showError('Please enter vehicle number');
      return;
    }

    // if (_selectedOption == 'Subscription' && _selectedSubscriptionType == null) {
    //   _showError('Please select a subscription type');
    //   return;
    // }

    if (_selectedOption == 'Subscription' && subscriptionDateTimeController.text.isEmpty) {
      _showError('Please select a parking date and time for the subscription');
      return;
    }

    if (_selectedOption == 'Schedule' && dateeTimeController.text.isEmpty) {
      _showError('Please select a parking date and time for the scheduled booking');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final url = Uri.parse('${ApiConfig.baseUrl}vendor/vendorcreatebooking');
    print('API URL: $url'); // Debugging URL

    print('Selected vehicle type: $vehicleType'); // Debugging selected vehicle type

    String status = (_selectedOption == 'Instant' || _selectedOption == 'Subscription') ? 'PARKED' : 'PENDING';

    DateTime now = DateTime.now();
    String approvedDate = '';
    String approvedTime = '';
    String parkingDate = '';
    String parkingTime = '';
    String amount = '';
    String subscriptionEndDate = ''; // Variable to store subscription end date

    if (_selectedOption == 'Subscription') {
      // Find the monthly charge for the selected vehicle type
      final monthlyCharge = charges.firstWhere(
            (charge) => charge.category == vehicleType && charge.type == 'Monthly',
        orElse: () => ParkingCharge(category: vehicleType, type: 'Monthly', amount: '0', id: ''),
      );
      amount = monthlyCharge.amount;

      // Parse the selected subscription date and time
      try {
        DateTime subscriptionDateTime = DateFormat("dd-MM-yyyy hh:mm a").parse(subscriptionDateTimeController.text);

        // Calculate the date 30 days from the selected subscription date
        DateTime subscriptionEndDateTime = subscriptionDateTime.add(const Duration(days: 30));

        // Format the dates and times
        approvedDate = DateFormat("dd-MM-yyyy").format(subscriptionDateTime);
        approvedTime = DateFormat("hh:mm a").format(subscriptionDateTime);
        parkingDate = approvedDate;
        parkingTime = approvedTime;

        // Format the subscription end date (30 days later)
        subscriptionEndDate = DateFormat("dd-MM-yyyy hh:mm a").format(subscriptionEndDateTime);

        print("Subscription Start Date: $approvedDate $approvedTime");
        print("Subscription End Date: $subscriptionEndDate");
      } catch (e) {
        _showError('Invalid subscription date and time format');
        setState(() {
          _isLoading = false;
        });
        return;
      }
    } else if (_selectedOption == 'Instant' || _selectedOption == 'Schedule') {
      // For instant or schedule, calculate amount based on hourly or daily rates
      final chargeType = isHourly ? 'Hourly' : 'Daily';
      final charge = charges.firstWhere(
            (charge) => charge.category == vehicleType && charge.type == chargeType,
        orElse: () => ParkingCharge(category: vehicleType, type: chargeType, amount: '0', id: ''),
      );
      amount = charge.amount;

      if (_selectedOption == 'Instant') {
        approvedDate = DateFormat("dd-MM-yyyy").format(now);
        approvedTime = DateFormat("hh:mm a").format(now);
        parkingDate = DateFormat("dd-MM-yyyy").format(selectedDateTime ?? now);
        parkingTime = DateFormat("hh:mm a").format(selectedDateTime ?? now);
      } else if (_selectedOption == 'Schedule') {
        try {
          DateTime scheduleDateTime = DateFormat("dd-MM-yyyy hh:mm a").parse(dateeTimeController.text);
          parkingDate = DateFormat("dd-MM-yyyy").format(scheduleDateTime);
          parkingTime = DateFormat("hh:mm a").format(scheduleDateTime);
        } catch (e) {
          _showError('Invalid schedule date and time format');
          setState(() {
            _isLoading = false;
          });
          return;
        }
      }
    }

    final data = {
      'carType': CartypeController.text,
      'personName': nameController.text,
      'mobileNumber': mobileController.text,
      'vehicleNumber': carController.text,
      'vendorName': _vendor?.vendorName ?? '',
      'sts': _selectedOption ?? 'Instant',
      'bookingDate': DateFormat("dd-MM-yyyy").format(now),
      'vendorId': widget.vendorid,
      'amount': amount,
      'hour': "", // TODO: Set for hourly bookings
      'status': status,
      'vehicleType': vehicleType,
      'parkingDate': parkingDate,
      'parkingTime': parkingTime,
      'bookingTime': DateFormat("hh:mm a").format(now),
      'cancelledStatus': "",
      'subsctiptiontype': _selectedSubscriptionType ?? '',
      'approvedDate': approvedDate,
      'approvedTime': approvedTime,
      'parkedDate': approvedDate,
      'subsctiptionenddate': subscriptionEndDate, // Include subscription end date
      'parkedTime': approvedTime,
      'bookType': isHourly ? 'Hourly' : '24 Hours',
    };

    print('Request body: ${jsonEncode(data)}'); // Debugging request body

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your_token', // Replace with actual token
        },
        body: jsonEncode(data),
      );

      print('Response status: ${response.statusCode}'); // Debugging response status
      print('Response body: ${response.body}'); // Debugging response body

      if (response.statusCode == 200) {
        final responseBody = jsonDecode(response.body);
        print('Response success: ${responseBody['message']}'); // Debugging success message

        if (responseBody['message'] == 'Booking created successfully') {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => vendordashScreen(
                initialTabIndex: _selectedIndex,
                vendorid: widget.vendorid,
              ),
            ),
          );
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Parking successfully registered!')),
          );

          // Clear form fields
          CartypeController.clear();
          nameController.clear();
          mobileController.clear();
          carController.clear();
          subscriptionDateTimeController.clear();
          dateeTimeController.clear();
          _selectedSubscriptionType = null;
        } else {
          _showError('${responseBody['message']}');
        }
      } else {
        _showError('Failed to register parking. Please try again.');
      }
    } catch (e) {
      print('Exception occurred: $e'); // Debugging exception
      _showError('An error occurred: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
// Function to display error message
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message, style: GoogleFonts.poppins(color: Colors.red))),
    );
    print('Error displayed: $message');
  }

  bool showSubscriptionOptions = false; // Track whether to show subscription options
  @override
  void dispose() {
    // Cancel the timer when the widget is disposed to avoid memory leaks
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    List<ParkingCharge> carEntries = charges.where((charge) => charge.category == 'Car').toList();
    List<ParkingCharge> bikeentries = charges.where((charge) => charge.category == 'Bike').toList();
    List<ParkingCharge> others = charges.where((charge) => charge.category == 'Others').toList();

    return  isLoading
        ? const LoadingGif() // Show loading GIF before the Scaffold
        : Scaffold(
      backgroundColor: Colors.white,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60.0),
        child: Container(
          decoration: const BoxDecoration(

          ),
          child: AppBar(titleSpacing: 0,
            backgroundColor: ColorUtils.secondarycolor(),
            title:  Text(
              'New Booking',
              style: GoogleFonts.poppins(color: Colors.black),
            ),
            iconTheme: const IconThemeData(color: Colors.black),
            actions: [
              IconButton(
                onPressed: () {
                  // Use the `infoRow` widget somewhere in your UI
                  showDialog(
                    context: context,
                    builder: (context) {
                      return Dialog(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5.0), // Circular border
                        ),
                        child: SingleChildScrollView( // Make the dialog content scrollable
                          child: infoRow(
                            context: context,
                            carEntries: carEntries,
                            bikeEntries: bikeentries,
                            otherEntries: others,
                            title: "Price Charts",
                            value: "",
                            icon: Icons.currency_rupee,
                            iconCheck: true,
                          ),
                        ),
                      );
                    },
                  );
                },
                icon:  Icon(Icons.info_outline, color: ColorUtils.primarycolor(),), // Set the icon here

              ),
              const SizedBox(width: 15,),
            ],
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(15.0),
            child: Column(
              children: [
                const SizedBox(height: 15),
                Wrap(
                  spacing: 5.0, // Horizontal space between items
                  runSpacing: 10.0, // Vertical space between rows
                  children: List.generate(cate.length, (index) {
                    bool isSelected = _selectedIndex == index;
        
                    return CategoryItem(
                      title: cate[index],
                      icon: index == 0
                          ? Icons.directions_car
                          : index == 1
                          ? Icons.two_wheeler
                          : Icons.miscellaneous_services,
                      isSelected: isSelected,
                      onTap: () {
                        setState(() {
                          _selectedIndex = index;
                        });
                      },
                      customTeal: customTeal,
                      isFirst: index == 0,
                      isLast: index == cate.length - 1,
                    );
                  }),
                ),
        
        
        
        
        
                const SizedBox(height: 15),
        
        
        
                CuTextField(
                  labelColor: customTeal,
                  selectedColor: customTeal,
                  controller: carController,
                  focusNode: _carFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.next,
                  inputFormatter: [
                    UpperCaseTextFormatter(),
                  ],
                  label: 'Enter Vehicle No *',
                  hint: 'Vehicle No',
                  prefixIcon: Icon(
                    _selectedIndex == 0
                        ? Icons.directions_car
                        : _selectedIndex == 1
                        ? Icons.two_wheeler
                        : Icons.miscellaneous_services,
                    color: Colors.red,
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
                        },
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _selectedOption == 'Instant' ? ColorUtils.primarycolor() : Colors.white,
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(color: ColorUtils.primarycolor(),),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.flash_on,
                                color: _selectedOption == 'Instant' ? Colors.white : Colors.black,
                              ),
                              const SizedBox(width: 5),
                              const SizedBox(height: 5),
                              Text(
                                'Instant Parking',
                                textAlign: TextAlign.center,
                                style:GoogleFonts.poppins(
                                  fontSize: 12,
                                  color: _selectedOption == 'Instant' ? Colors.white : Colors.black,
                                  fontWeight: _selectedOption == 'Instant' ? FontWeight.bold : FontWeight.normal, // Adjust font weight based on selection
                                  height: 1.0, // Adjust this value to reduce line spacing
                                ),
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
                        },
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _selectedOption == 'Schedule' ? ColorUtils.primarycolor() : Colors.white,
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(color: ColorUtils.primarycolor(),),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.calendar_today,
                                color: _selectedOption == 'Schedule' ? Colors.white : Colors.black,
                              ),
                              const SizedBox(width: 5),
                              const SizedBox(height: 5),
                              Text(
                                'Schedule Parking',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  color: _selectedOption == 'Schedule' ? Colors.white : Colors.black,
                                  fontWeight: _selectedOption == 'Schedule' ? FontWeight.bold : FontWeight.normal, // Adjust font weight based on selection
                                  height: 1.0,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Subscription Option
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedOption = 'Subscription';
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _selectedOption == 'Subscription' ? ColorUtils.primarycolor() : Colors.white,
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(color: ColorUtils.primarycolor(),),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.subscriptions,
                                color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                              ),
                              const SizedBox(height: 5),
                              const SizedBox(width: 5),
                              Center(
                                child: Text(
                                  'Parking Subscription',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.poppins(fontSize: 12,
                                    height: 1.0,
                                    color: _selectedOption == 'Subscription' ? Colors.white : Colors.black,
                                    fontWeight: _selectedOption == 'Subscription' ? FontWeight.bold : FontWeight.normal, // Adjust font weight based on selection
                                  ),
                                ),
                              )
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 15),
        
                if (_selectedOption == 'Instant' || _selectedOption == 'Schedule')
                  Row(
                    children: [
                      Container(
                        child: Text(
                          "Hourly",
                          style: GoogleFonts.poppins(fontSize: 14),
                        ),
                      ),
                      const SizedBox(width: 6,),
                      AnimatedToggleSwitch<bool>.dual(
                        current: isHourly,
                        first: true, // Represents Hourly
                        second: false, // Represents 24 Hours
                        borderWidth: 1.0,
                        height: 24.0,
                        spacing: 15.0,
                        styleBuilder: (val) => ToggleStyle(
                          backgroundColor: Colors.black,
                          borderColor: Colors.grey.shade400,
                          indicatorColor: val ? ColorUtils.primarycolor() : Colors.red,
                        ),
                        onChanged: (val) {
                          setState(() {
                            isHourly = val; // Update the state based on the toggle
                          });
                        },
                        iconBuilder: (val) => Icon(
                          val ? Icons.access_time : Icons.access_alarm, // Change icon based on selection
                          color: Colors.white,
                          size: 16,
                        ),
                        // Removed textBuilder to exclude text inside the toggle
                      ),
                      const SizedBox(width: 5,),
                      Container(
                        child: Text(
                          "Full day",
                          style: GoogleFonts.poppins(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
        
                const SizedBox(height: 15),
                if (_selectedOption == 'Schedule') ...[
        
                  const SizedBox(height: 15),
                  CusTextField(
                    labelColor: customTeal,
                    selectedColor: customTeal,
                    controller: dateeTimeController,
                    focusNode: _dateeTimeFocusNode,
                    keyboard: TextInputType.text,
                    obscure: false,
                    textInputAction: TextInputAction.done,
                    inputFormatter: const [],
                    label: 'Select Parking Date & Time',
                    hint: 'Select Parking Date & Time',
                    prefixIcon: Icon(Icons.calendar_today, color: customTeal,size: 14,),
                    readOnly: true,
                    onTap: () async {
                      _showDateTimePicker(); // Opens the date-time picker
                    },
                  ),
                ],
        
                if (_selectedOption == 'Subscription') ...[
                  // const SizedBox(height: 10),
        
            // const SizedBox(height: 10),
            //             DropdownButtonFormField<String>(
            //               value: dropdownValue,
            //               decoration: InputDecoration(
            //                 labelText: 'Subscription',
            //                 labelStyle: GoogleFonts.poppins(color: Colors.black),
            //                 border: OutlineInputBorder(
            //                   borderSide: BorderSide(color: ColorUtils.primarycolor()),
            //                 ),
            //                 enabledBorder: OutlineInputBorder(
            //                   borderSide: BorderSide(color: ColorUtils.primarycolor()),
            //                 ),
            //                 focusedBorder: OutlineInputBorder(
            //                   borderSide: BorderSide(color: ColorUtils.primarycolor()),
            //                 ),
            //                 isDense: true, // Reduces the height of the field
            //                 contentPadding: const EdgeInsets.symmetric(vertical: 13.0, horizontal: 12.0), // Adjust vertical padding to reduce height
            //               ),
            //               items: subscriptionOptions.map((String status) {
            //                 return DropdownMenuItem<String>(
            //                   value: status,
            //                   child: Text(status),
            //                 );
            //               }).toList(),
            //               onChanged: (value) {
            //                 setState(() {
            //                   dropdownValue = value;
            //                   _selectedSubscriptionType = value; // Store the selected subscription type
            //                 });
            //               },
            //               validator: (value) => value == null ? 'Please select your subscription type' : null,
            //             ),
        ],
        //
                if (_selectedOption == 'Subscription') ...[
        
                  const SizedBox(height: 15),
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
                    prefixIcon: Icon(Icons.calendar_today, color: customTeal,size: 14,),
                    readOnly: true,
                    onTap: () async {
                      _showDateTimePickerForSubscription();
                    },
                  ),
                ],
        
        
            if (_selectedOption == 'Instant') ...[
        const SizedBox(height: 15),
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
                  prefixIcon: Icon(Icons.calendar_month_outlined, color: customTeal,size: 14,),
                  readOnly: true,
        
                  // onTap: () async {
                  //   _showDateTimePicker(); // Opens the date-time picker
                  // },
                ),
                ],
                const SizedBox(height: 15),
                Container(
                  alignment: Alignment.centerLeft, // Aligns text to the left
                  child:  Text(
                    " Optional Information",
                    style: GoogleFonts.poppins(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
        
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
                  label: 'Tentitve checkout date & time',
                  hint: ' Tentitve checkout date & time',
                  prefixIcon: Icon(Icons.calendar_month_outlined, color: customTeal,size: 14,), // Icon color for car
                  readOnly: true,
                  onTap: () async {
                    _tenditivecheckout(); // Opens the date-time picker
                  },
        
        
                ),
        
                const SizedBox(height: 15),
            ],
                if (_selectedIndex == 0)
            if (_selectedIndex == 0) ...[
                CusTextField(
                  labelColor: customTeal,
                  controller: CartypeController,
                  focusNode: _CartypeFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.next,
                  inputFormatter: const [], // You can add any input formatters here
                  label: 'Car Type ',
                  hint: 'Car Type',
                  prefixIcon: Icon(Icons.directions_car, color: customTeal,size: 14,), // Icon color for parking place
        
                  selectedColor: customTeal,
        
                ),
        
                const SizedBox(height: 15),
                ],
                CusTextField(
                  labelColor: customTeal,
                  controller: nameController,
                  focusNode: _nameFocusNode,
                  keyboard: TextInputType.text,
                  obscure: false,
                  textInputAction: TextInputAction.next,
                  inputFormatter: const [], // You can add any input formatters here
                  label: 'Person name ',
                  hint: 'Name',
                  prefixIcon: Icon(Icons.person, color: customTeal,size: 14,), // Icon color for parking place
        
                  selectedColor: customTeal,
        
                ),
        
                const SizedBox(height: 15),
        
                CusTextField(
                  labelColor: customTeal,
                  controller: mobileController,
                  focusNode: _mobileFocusNode,
                  keyboard: TextInputType.number, // Use number keyboard
                  obscure: false,
                  textInputAction: TextInputAction.next,
                  inputFormatter: [
                    FilteringTextInputFormatter.digitsOnly, // Allow only digits
                    LengthLimitingTextInputFormatter(10), // Limit to 10 digits
                  ],
                  label: 'Mobile number',
                  hint: 'Mobile Number',
                  prefixIcon: Icon(Icons.phone_android, color: customTeal,size: 14,),
                  selectedColor: customTeal,
                ),
        
        
        
        
        
                const SizedBox(height: 15),
        
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
        
                    Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        decoration: BoxDecoration(
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2), // Shadow color with opacity
                              offset: const Offset(0, 4), // Offset in x and y direction
                              blurRadius: 6, // Blur radius for the shadow
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _registerParking,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: customTeal,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: _isLoading
                              ? const CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                          )
                              :  Text('Book Now', style:GoogleFonts.poppins(color: Colors.white)),
                        ),
                      ),
                    ),
                  ],
                ),
        
        
        
            ]),
          ),
        ),
      ),
    );
  }
  Widget infoRow({
    required BuildContext context,
    required List<ParkingCharge> carEntries,
    required List<ParkingCharge> bikeEntries,
    required List<ParkingCharge> otherEntries,
    required String title,
    required String value,
    required IconData icon,
    bool iconCheck = false,
  }) {
    // Combine the lists into a single list for grid display
    List<ParkingCharge> allEntries = [
      ...carEntries,
      ...bikeEntries,
      ...otherEntries,
    ];

    return Container(
      width: 500,
      decoration: BoxDecoration(
        color: ColorUtils.secondarycolor(),
        borderRadius: BorderRadius.circular(5.0), // Full border radius applied here
        border: Border.all(
          color: ColorUtils.primarycolor(), // Border color
          width: 1, // Border thickness
        ),
      ),
      // color: ColorUtils.secondarycolor(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 5),
          // Title and Icon Row
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color:   ColorUtils.primarycolor(),),
              const SizedBox(width: 10),
              Text(title, style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
            ],
          ),

          const SizedBox(height: 0),

          // GridView to display the charges in a grid format
          Container(
            child: GridView.builder(
              shrinkWrap: true,  // Make the GridView take up only the necessary space
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,  // Number of columns in the grid
                childAspectRatio: 1.3, // Aspect ratio of each card
              ),
              itemCount: allEntries.length,
              itemBuilder: (context, index) {
                final entry = allEntries[index];
                return Card(
                  color: Colors.white,
                  elevation: 4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5.0), // Optional: rounded corners
                    side: BorderSide(
                      color: ColorUtils.primarycolor(), // Color of the outline
                      width: 0.5, // Thickness of the outline
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(1.0), // Reduced padding
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          entry.category,
                          style: GoogleFonts.poppins(
                            fontSize: 12, // Font size for category
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        // SizedBox(height: 3),
                        Text(
                          entry.type,
                          style: GoogleFonts.poppins(
                            fontSize: 7, // Font size for type
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        // SizedBox(height: 3), // Space between type and amount
                        Text(
                          '₹${entry.amount}',
                          style:GoogleFonts.poppins(
                            fontSize: 10, // Font size for amount
                            color: Colors.grey[600],
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }


}

class CategoryItem extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final Color customTeal;
  final bool isFirst;
  final bool isLast;

  const CategoryItem({
    super.key,
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
    required this.customTeal,
    this.isFirst = false,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 47,
        width: 106,  // Set the width to a larger value (e.g., 150 or 120)
        // padding: EdgeInsets.symmetric(horizontal: 12.0), // Adjust padding if needed
        decoration: BoxDecoration(
          color: isSelected ? customTeal : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(isFirst ? 5.0 : 0.0),
            bottomLeft: Radius.circular(isFirst ? 5.0 : 0.0),
            topRight: Radius.circular(isLast ? 5.0 : 0.0),
            bottomRight: Radius.circular(isLast ? 5.0 : 0.0),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(icon, color: isSelected ? Colors.white : Colors.black),
            const SizedBox(width: 9.0), // Adjust space between icon and title
            Text(
              title,
              style:GoogleFonts.poppins(
                color: isSelected ? Colors.white : Colors.black,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}



class CusTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final TextInputType keyboard;
  final bool obscure;
  final TextInputAction textInputAction;
  final List<TextInputFormatter> inputFormatter;
  final String label;
  final String hint;
  final Widget prefixIcon;
  final Function(String)? onSubmitted;
  final bool readOnly;
  final Function()? onTap;
  final Widget? suffixIcon;
  final Color selectedColor;
  final Color labelColor;

  const CusTextField({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.keyboard,
    required this.obscure,
    required this.textInputAction,
    required this.inputFormatter,
    required this.label,
    required this.hint,
    required this.prefixIcon,
    this.onSubmitted,
    this.readOnly = false,
    this.onTap,
    this.suffixIcon,
    required this.selectedColor,
    required this.labelColor,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: keyboard,
        obscureText: obscure,
        textInputAction: textInputAction,
        inputFormatters: inputFormatter,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          hintStyle: GoogleFonts.poppins(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 8.0), // Add space before icon
            child: prefixIcon,

          ),
          suffixIcon: suffixIcon,
          filled: true,
          fillColor: Colors.white,
          labelStyle: GoogleFonts.poppins(color: Colors.grey, fontSize: 14,),
          contentPadding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 12.0),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(5.0),
            borderSide: const BorderSide(color: Colors.grey),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(5.0),
            borderSide: const BorderSide(color: Colors.grey, width: 0.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(5.0),
            borderSide: const BorderSide(color: Colors.grey, width: 0.5),
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 20), // Adjusted to remove extra space
          suffixIconConstraints: const BoxConstraints(minWidth: 10, minHeight: 20),
        ),
        readOnly: readOnly,
        onTap: onTap,
        onSubmitted: onSubmitted,
      ),
    );
  }
}

class CuTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final TextInputType keyboard;
  final bool obscure;
  final TextInputAction textInputAction;
  final List<TextInputFormatter> inputFormatter;
  final String label;
  final String hint;
  final Widget prefixIcon;
  final Function(String)? onSubmitted;
  final bool readOnly;
  final Function()? onTap;
  final Widget? suffixIcon;
  final Color selectedColor; // For focused border color
  final Color labelColor; // For label text color
  final bool isSelected;
  const CuTextField({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.keyboard,
    required this.obscure,
    required this.textInputAction,
    required this.inputFormatter,
    required this.label,
    required this.hint,
    required this.prefixIcon,
    this.onSubmitted,
    this.readOnly = false,
    this.onTap,
    this.suffixIcon,
    required this.selectedColor, // Initialize selectedColor
    required this.labelColor,
    this.isSelected = false,// Initialize labelColor
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      keyboardType: keyboard,
      obscureText: obscure,
      textInputAction: textInputAction,
      inputFormatters: inputFormatter,

      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 8.0), // Add space before icon
          child: prefixIcon,
        ),
        suffixIcon: suffixIcon,
        filled: true, // Fill the background
        fillColor: Colors.white, // Keep background white
        labelStyle:GoogleFonts.poppins(color: Colors.red,),

        contentPadding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 12.0),// Set label text color
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(5.0),
          borderSide: const BorderSide(color: Colors.red,), // Default border color
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(5.0),
          borderSide: const BorderSide(color: Colors.red, width: 0.5), // Use primary color when focused
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(5.0),
          borderSide: const BorderSide(color: Colors.red, width: 0.5), // Use grey for enabled state
        ),
      ),
      readOnly: readOnly,
      onTap: onTap,
      onSubmitted: onSubmitted,
    );
  }
}


class greyfield extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final TextInputType keyboard;
  final bool obscure;
  final TextInputAction textInputAction;
  final List<TextInputFormatter> inputFormatter;
  final String label;
  final String hint;
  final Widget prefixIcon;
  final Function(String)? onSubmitted;
  final bool readOnly;
  final Function()? onTap;
  final Widget? suffixIcon;
  final Color selectedColor; // For focused border color
  final Color labelColor; // For label text color

  const greyfield({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.keyboard,
    required this.obscure,
    required this.textInputAction,
    required this.inputFormatter,
    required this.label,
    required this.hint,
    required this.prefixIcon,
    this.onSubmitted,
    this.readOnly = false,
    this.onTap,
    this.suffixIcon,
    required this.selectedColor, // Initialize selectedColor
    required this.labelColor, // Initialize labelColor
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: keyboard,
        obscureText: obscure,
        textInputAction: textInputAction,
        inputFormatters: inputFormatter,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 8.0), // Add space before icon
            child: prefixIcon,
          ),
          suffixIcon: suffixIcon,
          filled: true, // Fill the background
          fillColor: Colors.grey[200], // Change this to grey color for background
          labelStyle: GoogleFonts.poppins(color: Colors.grey, ),
          contentPadding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 12.0),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(5.0),
            borderSide: const BorderSide(color: Colors.grey, ),
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 20), // Adjusted to remove extra space
          suffixIconConstraints: const BoxConstraints(minWidth: 10, minHeight: 20),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(5.0),
            borderSide: const BorderSide(color: Colors.grey,  width: 0.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(5.0),
            borderSide: const BorderSide(color: Colors.grey,  width: 0.5),
          ),

        ),

        readOnly: readOnly,
        onTap: onTap,
        onSubmitted: onSubmitted,
      ),
    );
  }
}
