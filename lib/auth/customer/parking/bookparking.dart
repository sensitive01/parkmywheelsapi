import 'dart:async';

import 'package:animated_custom_dropdown/custom_dropdown.dart';
import 'package:animated_toggle_switch/animated_toggle_switch.dart';
import 'package:bottom_picker/bottom_picker.dart';
import 'package:bottom_picker/resources/arrays.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:intl/intl.dart';
import 'package:mywheels/auth/customer/addcarviewcar/Addmycar.dart';
import 'package:mywheels/auth/customer/bookticket.dart';
import 'package:mywheels/auth/customer/parking/scanner.dart';
import 'package:mywheels/auth/vendor/editpage/editslots.dart';
import 'package:mywheels/config/authconfig.dart';

import 'package:mywheels/config/colorcode.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../../../model/user.dart';
import '../../vendor/vendorcreatebooking.dart';
import 'monthlysubscriptionpayment.dart';
class ChooseParkingPage extends StatefulWidget {
  final String userId;
  final String? selectedOption;
  final String? vendorId;

  final String? vendorName;
  const ChooseParkingPage({super.key, required this.userId,this.selectedOption,    this.vendorId,

     this.vendorName,});

  @override
  _ChooseParkingPageState createState() => _ChooseParkingPageState();
}
class _ChooseParkingPageState extends State<ChooseParkingPage> {
  Color customTeal = ColorUtils.primarycolor();
  DateTime? selectedDateTime;

  late Future<List<Vendor>> _vendors;
  String? _selectedVendor;
  bool isHourly = true;
  List<String> hours = List.generate(24, (index) {
    return index < 10 ? '0$index:00' : '$index:00';
  });

  static String getDayOfWeek(int index) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[index];
  }

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
  List<BusinessHours> businessHours = [];
  bool isVendorOpen = false;
  String closedReason = "";
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
  // ... existing code ...
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

        // Check if the response contains the expected charges list
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
        // Handle 404 error
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

        // Check if the response contains the expected charges list
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
  int availableSlots = 0; // Declare this in your state class

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
  List<Vendor> vendors = [];

  DateTime? instantParkingDateTime;
  DateTime? scheduledParkingDateTime;
  DateTime? subscriptionParkingDateTime;
  final FocusNode _dateTimeFocusNode = FocusNode();
  late Timer _timer;
  // final String apiUrl = '${ApiConfig.baseUrl}get-slot-details-vendor';
  bool _isLoading=false;

  String? dropdownValue; // Initial selected value

  String? _selectedCarType;

  final List<String> subscriptionOptions = [
    "Monthly Subscription",
  ];
  Future<void> _fetchUserData() async {
    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-userdata?id=${widget.userId}'));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['success'] && data['data'] != null) {
          setState(() {
            _user = User.fromJson(data['data']); // Initialize user with fetched data
          });
          // Print the fetched user data for debugging
          print('Fetched user data: ${data['data']}');
        } else {
          throw Exception(data['message']);
        }
      } else {
        throw Exception('Failed to load user data');
      }
    } catch (error) {
      print('Error fetching user data: $error');
      // Show error message to user
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load user data')),
      );
    }
  }

  User? _user;
  @override
  void initState() {
    super.initState();
    isLoading = true; // Start loading
    fetchVendors().then((_) {
      setState(() {
        isLoading = false; // Stop loading after fetching
      });
    });
    _selectedOption = widget.selectedOption ?? 'Temporary';

      dropdownValue = subscriptionOptions.first; // Initialize with the first option
    _vendors = fetchVendors();
    fetchGstData().then((gstData) {
      setState(() {
        gstPercentage = double.parse(gstData['gst']?.toString() ?? '0');
        handlingFee = double.parse(gstData['handlingfee']?.toString() ?? '0');
      });
    });
    fetchCars(widget.userId);
    final now = DateTime.now();
    datTimeController.text = _formatDateTime(now);
    dateTimeController.text = _getFormattedCurrentDateTime();
    selectedDateTime = now;
    _fetchUserData();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      // Update the controller with the new formatted date and time every second
      setState(() {
        dateTimeController.text = _getFormattedCurrentDateTime();
        if (_selectedOption == 'Instant') {
          checkIfVendorIsOpen(); // Continuously check for Instant mode
        }
      });
    });
    dropdownValue = subscriptionOptions.first;
  }


  // Helper function to format date (day, month, year) and time (hour, minute, AM/PM)
  String _formatDateTime(DateTime dateTime) {
    return DateFormat("dd-MM-yyyy hh:mm a").format(dateTime);  // Full date + time with AM/PM
  }
  Future<List<Vendor>> fetchVendors() async {
    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}getvisibilityvendor'));
      if (response.statusCode == 200) {
        Map<String, dynamic> data = json.decode(response.body);
        List<dynamic> vendorData = data['vendorData'];

        // Filter vendors with status 'approved'
        List<Vendor> approvedVendors = vendorData
            .map((json) => Vendor.fromJson(json))
            .where((vendor) => vendor.status.toLowerCase() == 'approved')
            .toList();

        setState(() {
          vendors = approvedVendors; // Store approved vendors in state
          isLoading = false;         // Data loaded, stop showing the loader
        });

        return approvedVendors; // Return the list of approved vendors
      } else {
        print('Response status: ${response.statusCode}');
        print('Response body: ${response.body}');
        throw Exception('Failed to load vendors');
      }
    } catch (e) {
      print('Error fetching vendors: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error fetching vendors: $e')),
      );
      return []; // Return an empty list in case of error
    }
  }

  String _getFormattedCurrentDateTime() {
    DateTime now = DateTime.now();
    DateFormat formatter = DateFormat('dd-MM-yyyy hh:mm a'); // 12-hour format with AM/PM
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
                  if (selectedVendor != null) {
                    checkBusinessHours(selectedVendor!.id).then((_) {
                      checkIfVendorIsOpen(); // This will refresh the UI
                    });
                  }
                });
                Navigator.pop(context);
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
                Navigator.pop(context);
              },
              bottomPickerTheme: BottomPickerTheme.temptingAzure,
            ),
          ),
        );
      },
    );
  }
  @override
  void dispose() {
    _parkingPlaceController.dispose();
    carController.dispose();

    super.dispose();
  }
  Future<void> _payNow() async {
    // Validate required fields
    if (selectedVendor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a parking place")),
      );
      return;
    }
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
      'place': selectedVendor?.vendorName ?? '',
      'vehicleNumber': carController.value ?? '',
      'vendorName': selectedVendor?.vendorName ?? '',
      'time': formattedTime,
      'vendorId': selectedVendor?.id ?? '',
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
    if (selectedVendor == null || businessHours.isEmpty) {
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
  Future<void> _registerParking() async {
    // Check which field is null and show an appropriate message
    if (selectedVendor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a parking place")),
      );
      return;
    }
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
    if (_selectedOption == 'Schedule' && (selectedDateTime == null || subscriptionDateTimeController.text.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a date and time for scheduling")),
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
        'place': selectedVendor?.vendorName ?? '',
        'vehicleNumber': carController.value ?? '',
        'vendorName': selectedVendor?.vendorName ?? '',
        'time': formattedTime,
        'vendorId': selectedVendor?.id ?? '',
        'bookingDate': DateFormat("dd-MM-yyyy").format(now),
        'parkingDate': formattedDate,
        'carType': _selectedCarType ?? '',
        'personName': _user?.username ?? '',
        'mobileNumber': _user?.mobileNumber ?? '',
        'sts': _selectedOption ?? 'Instant',
        'amount': amount, // Pass the subscription amount for Subscription
        'hour': hour, // Pass the hour/type for Instant or Schedule
        'subscriptionType': _selectedSubscriptionType ?? '',
        'status': "PENDING",
        'vehicleType': selectedCarType ?? '',
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

      // Debugging: Print the response status and body
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final String otp = responseData['otp'].toString();

        String bookingId = responseData['bookingId']; // Extract the booking ID
        String bookedDate = DateFormat("dd-MM-yyyy hh:mm a").format(now);
        String status = "PENDING"; // Example: set status as "Confirmed"
        String schedule = formattedDate; // Example: use the parking date as schedule

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Parking registered successfully!')),
        );
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => bookticket(
              bookingtype: (responseData['bookType'] ?? "").toString(),
              otp: (responseData['otp'] ?? "").toString(),
              sts: (responseData['sts'] ?? "").toString(),
              bookedid: bookingId ?? '',
              vehiclenumber: carController.value ?? '',
              vendorname: selectedVendor?.vendorName ?? '',
              vendorid: selectedVendor?.id ?? '',
              parkingdate: formattedDate,
              parkingtime: formattedTime,
              vehicletype: selectedCarType ?? '',
              bookeddate: bookedDate, // Pass the booked date
              status: status, // Pass the status
              schedule: schedule,
              mobileno: _user?.mobileNumber ?? '',
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
          decoration: const BoxDecoration(

          ),
          child: AppBar(titleSpacing: 0,
            // backgroundColor: ColorUtils.primarycolor(),
            title:Text(
              'Book Parking',
              style: GoogleFonts.poppins(color: Colors.black,fontSize: 18),
            ),
            iconTheme: const IconThemeData(color: Colors.black),
            actions: [
              IconButton(
                onPressed: () {        Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => ScannerPage(userId: widget.userId)),
                );},
                icon:  Icon(Icons.qr_code_scanner,color: ColorUtils.primarycolor(),),
              ),
              const SizedBox(width: 10,),
            ],

          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(left: 15.0,right: 15.0,bottom: 15.0),
          child: SingleChildScrollView(
            child: Column(
              children: [
                // Text(
                //   _user?.mobileNumber ?? '',
                //   style: const TextStyle(
                //     color: Colors.black,
                //     fontWeight: FontWeight.bold,
                //     fontSize: 24,
                //   ),
                // ),
                // Text(
                //   'Vendor Name: ${selectedVendor!.vendorName}\nVendor ID: ${selectedVendor!.id}',
                //   style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                // ),

                // const SizedBox(height: 15),
               Container(
                  height: 55,
                  decoration: BoxDecoration(

                    border: Border.all(color:Colors.grey,  width: 0.5,), // Add a border
                    borderRadius: BorderRadius.circular(5), // Circular border radius
                  ),
                  child:
                  CustomDropdown<String?>.search(

                    hintText: 'Select Place',
                    items: vendors.map((vendor) => vendor.vendorName).toList(),
                    controller: _parkingPlaceController,
                    // In your onChanged for vendor selection:
                    onChanged: (String? value) {
                      setState(() {
                        selectedVendor = vendors.firstWhere(
                              (vendor) => vendor.vendorName == value,
                        );
                        print("Selected Vendor: ${selectedVendor?.vendorName}, ID: ${selectedVendor?.id}");
                        charges = []; // Clear charges
                        charge = [];  // Clear subscription charges
                        availableSlots = 0; // Reset available slots
                        if (selectedVendor != null && selectedCarType != null) {
                          checkBusinessHours(selectedVendor!.id).then((_) {
                            checkIfVendorIsOpen();
                          });
                          fetchChargesData(selectedVendor!.id, selectedCarType!);
                          fetchmonth(selectedVendor!.id, selectedCarType!);
                          fetchavailability(selectedVendor!.id, selectedCarType!);
                        }
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
                    : Container(
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
                            : Icons.directions_transit, // Default for 'Others'
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
                              charges = []; // Clear charges
                              charge = [];  // Clear subscription charges
                              availableSlots = 0; // Reset available slots
                              if (selectedVendor != null) {
                                checkBusinessHours(selectedVendor!.id).then((_) {
                                  checkIfVendorIsOpen();
                                });
                                fetchChargesData(selectedVendor!.id, selectedCarType!);
                                fetchmonth(selectedVendor!.id, selectedCarType!);
                                fetchavailability(selectedVendor!.id, selectedCarType!);
                              }
                            } else {
                              selectedCarType = null;
                              charges = [];
                              charge = [];
                              availableSlots = 0;
                            }
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),


              if (selectedVendor != null && selectedCarType != null) ...[
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


                const SizedBox(height: 5),







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

                const SizedBox(height: 15),
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
                      padding: const EdgeInsets.only(left: 10.0,right: 5),
                      child: Icon(Icons.calendar_today, size: 14, color: customTeal),
                    ),
                    readOnly: true,
                    onTap: () async {
                      _showDateTimePickerForSubscription(); // Opens the date-time picker
                    },
                  ),
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
                      padding: const EdgeInsets.only(left: 10.0,right: 5),
                      child: Icon(Icons.calendar_today, size: 14, color: customTeal),
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
                      padding: const EdgeInsets.only(left: 10.0,right: 5),
                      child: Icon(Icons.calendar_month_outlined,  size: 14,color: customTeal),
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
                    padding: const EdgeInsets.only(left: 10.0,right: 5),
                    child: Icon(Icons.calendar_month_outlined,size: 14, color: customTeal),
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
                    // decoration: BoxDecoration(
                    //   color: Colors.grey.shade100,
                    //   borderRadius: BorderRadius.circular(5),
                    //   border: Border.all(color: Colors.grey.shade300),
                    // ),
                    child: IconButton(
                      onPressed: selectedVendor != null ? () => _showOperationalTimingsBottomSheet() : null,
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
    if (selectedVendor == null || businessHours.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No operational timings available')),
      );
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
                              selectedVendor!.vendorName,
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
                        color: isVendorOpen ? Colors.green.shade50 : Colors.red
                            .shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isVendorOpen ? Colors.green.shade200 : Colors
                              .red.shade200,
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
                              padding: EdgeInsets.symmetric(
                                  horizontal: 14.0, vertical: 4.0),
                              child: Row(
                                children: [
                                  Expanded(flex: 3,
                                      child: Text('Day', style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12))),
                                  Expanded(flex: 3,
                                      child: Text('Open at', style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12))),
                                  Expanded(flex: 3,
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
                                      BoxShadow(color: Colors.black12,
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
                                            ? _statusLabel(
                                            '24 Hours', Colors.green)
                                            : _styledBox(dayData.openTime),
                                      ),
                                      if (!dayData.isClosed &&
                                          !dayData.is24Hours) const SizedBox(
                                          width: 8.0),
                                      if (!dayData.isClosed &&
                                          !dayData.is24Hours)
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
      contacts: (json['contacts'] as List? ?? [])
          .map((contactJson) => Contact.fromJson(contactJson))
          .toList(),
      latitude: json['latitude']?.toString() ?? '0',
      longitude: json['longitude']?.toString() ?? '0',
      address: json['address'] ?? '',
      landMark: json['landMark'] ?? '',
      image: json['image'] ?? '',
      parkingEntries: (json['parkingEntries'] as List? ?? [])
          .map((parkingEntryJson) => ParkingEntry.fromJson(parkingEntryJson))
          .toList(),
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
class BusinessHours {
  final String day;
  final String openTime;
  final String closeTime;
  final bool is24Hours;
  final bool isClosed;

  BusinessHours({
    required this.day,
    required this.openTime,
    required this.closeTime,
    required this.is24Hours,
    required this.isClosed,
  });

  factory BusinessHours.empty() {
    return BusinessHours(
      day: "",
      openTime: "",
      closeTime: "",
      is24Hours: false,
      isClosed: false,
    );
  }

  factory BusinessHours.fromJson(Map<String, dynamic> json) {
    return BusinessHours(
      day: json['day'] ?? '',
      openTime: json['openTime'] ?? '',
      closeTime: json['closeTime'] ?? '',
      is24Hours: json['is24Hours'] ?? false,
      isClosed: json['isClosed'] ?? false,
    );
  }
}