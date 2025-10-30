import 'dart:io';
import 'package:animated_toggle_switch/animated_toggle_switch.dart';
import 'package:custom_sliding_segmented_control/custom_sliding_segmented_control.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';
import 'package:mywheels/auth/vendor/bookings.dart';
import 'package:mywheels/auth/vendor/editamenities.dart' show Editamenities;
import 'package:mywheels/auth/vendor/editpage/editparkingpage.dart';
import 'package:mywheels/auth/vendor/editpage/editvendorprofile.dart';
import 'package:mywheels/auth/vendor/menus/addamenties.dart';
import 'package:mywheels/auth/vendor/menus/parkingchart.dart';
import 'package:mywheels/auth/vendor/qrcodeallowparking.dart';
import 'package:mywheels/auth/vendor/vendorbottomnav/flashbarvendor.dart';
import 'package:mywheels/auth/vendor/vendorbottomnav/thirdpage.dart';

import 'package:mywheels/auth/vendor/vendordash.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'package:mywheels/config/authconfig.dart';
import 'package:mywheels/config/colorcode.dart';
import 'package:shimmer/shimmer.dart';
import 'package:tab_container/tab_container.dart';





import '../menus/addparkingchart.dart';
import '../menusscreen.dart';


class manageparkingarea extends StatefulWidget {
  final String vendorid;
  // final int initialTabIndex;
  const manageparkingarea({super.key,
    required this.vendorid,
    // this.initialTabIndex = 0
    // required this.userName
  });

  @override
  State<manageparkingarea> createState() => _ThirdState();
}


class _ThirdState extends State<manageparkingarea>with TickerProviderStateMixin {
  // late TabController _chargesController; // Remove the nullable type
  TabController? _chargesController;
  final bool _isSlotListingExpanded = false;
  late final TabController _controller = TabController(length: 3, vsync: this);
  Vendors? _vendor;
  int _selecteddIndex = 3;//botom nav
  int selectedTabIndex = 0;
  int selecedIndex = 0;
  List<Map<String, dynamic>> businessHours = [];
  // Vendor? _vendor;
  final bool _isEditing = false;
  bool _isLoading = false;


  File? _selectedImage;

  late List<Widget> _pagess;






  // late List<Widget> _pagess;
  String? _menuImageUrl;

  void _navigateToPage(int index) {
    setState(() {
      _selecteddIndex = index;
    });
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => _pagess[index]),
    );
  }


  Future<void> _fetchVendorDat() async {
    try {
      final response = await http.get(
          Uri.parse('${ApiConfig.baseUrl}vendor/fetch-vendor-data?id=${widget.vendorid}')
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['data'] != null) {
          setState(() {
            _menuImageUrl = data['data']['image']; // Fetch menu image URL
          });
        } else {
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception('Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load vendor data. Please try again later.')),
      );
    }
  }
  List<ParkingCharge> charges = [];
  List<ParkingCharge> amenities = [];
  Future<List<ParkingCharge>> fetchamenities(String vendorId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId'); // Replace with your actual API URL

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

  Future<void> fetchFullDayMode(String vehicleType) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}vendor/getfullday/${widget.vendorid}'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body)['data'];
      setState(() {
        if (vehicleType == 'car') {
          selectcar = data['fulldaycar'] ?? 'Full Day';
        } else if (vehicleType == 'bike') {
          selectbike = data['fulldaybike'] ?? 'Full Day';
        } else if (vehicleType == 'others') {
          selectothers = data['fulldayothers'] ?? 'Full Day';
        }
      });
    } else {
      print("Failed to fetch full day mode: ${response.body}");
    }
  }

  Future<void> fetchEnabledVehicles() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchenable/${widget.vendorid}'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        setState(() {
          carEnabled = data['carEnabled'] ?? false;
          bikeEnabled = data['bikeEnabled'] ?? false;
          othersEnabled = data['othersEnabled'] ?? false;

          carTemporary = data['carTemporary'] ?? false;
          bikeTemporary = data['bikeTemporary'] ?? false;
          othersTemporary = data['othersTemporary'] ?? false;

          carFullDay = data['carFullDay'] ?? false;
          bikeFullDay = data['bikeFullDay'] ?? false;
          othersFullDay = data['othersFullDay'] ?? false;

          carMonthly = data['carMonthly'] ?? false;
          bikeMonthly = data['bikeMonthly'] ?? false;
          othersMonthly = data['othersMonthly'] ?? false;
        });

        // Reinitialize the TabController after updating enabled vehicles
        _initializeTabController();
      } else {
        throw Exception('Failed to fetch enabled vehicles');
      }
    } catch (e) {
      print('Error fetching enabled vehicles: $e');
    }
  }
  List<Map<String, dynamic>> _parseBusinessHours(Map<String, dynamic> data) {
    if (data['businessHours'] != null) {
      return List<Map<String, dynamic>>.from(data['businessHours'].map((item) {
        return {
          'day': item['day'] ?? getDayOfWeek(item['dayIndex'] ?? 0),
          'openTime': item['openTime'] ?? '09:00',
          'closeTime': item['closeTime'] ?? '21:00',
          'is24Hours': item['is24Hours'] ?? false,
          'isClosed': item['isClosed'] ?? false,
        };
      }));
    }
    // Return default business hours if API data is missing
    return List.generate(7, (index) {
      return {
        'day': getDayOfWeek(index),
        'openTime': '09:00',
        'closeTime': '21:00',
        'is24Hours': false,
        'isClosed': false,
      };
    });
  }
  List<String> hours = List.generate(24, (index) {
    return index < 10 ? '0$index:00' : '$index:00';
  });
  Future<Map<String, dynamic>> fetchVendor(String vendorId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/fetchbusinesshours/$vendorId'),
      );

      if (response.statusCode == 200) {
        isLoading = false;
        return json.decode(response.body);
      } else {
        throw Exception('Failed to fetch vendor');
      }
    } catch (e) {
      print('Error: $e');
      isLoading = false;
      return {};
    }
  }
  @override
  void initState() {
    super.initState();

    fetchFullDayMode('car');    // for car switch
    fetchFullDayMode('bike'); // for bike switch
    fetchFullDayMode('others'); // for others switch
    // Initial fetch functions
    _fetchVendorData();
    selectedTabIndex = 0;
    selecedIndex = 0;
    _pagess = [
      vendordashScreen(vendorid: widget.vendorid),
      Bookings(vendorid: widget.vendorid),
      qrcodeallowpark(vendorid: widget.vendorid),
      Third(vendorid: widget.vendorid),
      menu(vendorid: widget.vendorid),
    ];
    fetchVendor(widget.vendorid).then((data) {
      setState(() {
        businessHours = _parseBusinessHours(data); // Update businessHours with fetched data
      });
    });

    _fetchVendorDat();
    _controller.addListener(() {
      setState(() {
        selectedTabIndex = _controller.index;
      });
      fetchChargesData();
    });

    selecedIndex = 0;
    _initializeTabController();
    fetchChargesData(); // Fetch data
    fetchInitialData();
    fetchEnabledVehicles().then((_) {
      _initializeTabController();
      fetchChargesData();
    });// Call this for initial data fetch
  }
  void _initializeTabController() {
    final enabledTypes = getEnabledVehicleTypes();

    // Dispose of the old controller if it exists
    _chargesController?.dispose();

    if (enabledTypes.isEmpty) {
      _chargesController = null;
      selecedIndex = 0; // Reset index when no tabs
      return;
    }

    // Ensure selecedIndex is within bounds
    selecedIndex = selecedIndex.clamp(0, enabledTypes.length - 1);

    _chargesController = TabController(
      length: enabledTypes.length,
      vsync: this,
      initialIndex: selecedIndex,
    );

    _chargesController!.addListener(() {
      if (!_chargesController!.indexIsChanging) {
        setState(() {
          selecedIndex = _chargesController!.index;
        });
        fetchChargesData();
      }
    });
  }
  Future<void> fetchChargesData() async {
    setState(() {
      isLoading = true;
    });

    try {
      final enabledTypes = getEnabledVehicleTypes();
      if (enabledTypes.isEmpty || selecedIndex >= enabledTypes.length) {
        return; // Skip if no enabled types or invalid index
      }
      final currentType = enabledTypes[selecedIndex];

      switch (currentType) {
        case 'Car':
          await fetchMinimumCharge(widget.vendorid);
          await fetchAdditionalCharge(widget.vendorid);
          await fetchfulldaycar(widget.vendorid);
          await fetchfulldaymonthly(widget.vendorid);
          break;
        case 'Bike':
          await fetchbikeMinimumCharge(widget.vendorid);
          await fetchbikeAdditionalCharge(widget.vendorid);
          await fetchbikefulldaycar(widget.vendorid);
          await fetchbikefulldaymonthly(widget.vendorid);
          break;
        case 'Others':
          await fetchotherMinimumCharge(widget.vendorid);
          await fetchotherAdditionalCharge(widget.vendorid);
          await fetchotherfulldaycar(widget.vendorid);
          await fetchotherfulldaymonthly(widget.vendorid);
          break;
      }
    } catch (e) {
      showSnackBar("Error fetching charges: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  List<String> getEnabledVehicleTypes() {
    List<String> enabledTypes = [];
    if (carEnabled) enabledTypes.add('Car');
    if (bikeEnabled) enabledTypes.add('Bike');
    if (othersEnabled) enabledTypes.add('Others');
    return enabledTypes;
  }
  void fetchInitialData() {
    fetchChargesData(); // Fetch charges data
    fetchAmenitiesAndCharges(widget.vendorid); // Fetch amenities data
  }
  Future<void> _fetchVendorData() async {
    try {
      final response = await http.get(
          Uri.parse('${ApiConfig.baseUrl}vendor/fetch-vendor-data?id=${widget.vendorid}')
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['data'] != null) {
          setState(() {
            _vendor = Vendors.fromJson(data['data']);
            _isLoading = false; // Hide loading indicator after data is fetched
          });
        } else {
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception('Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      // ScaffoldMessenger.of(context).showSnackBar(
      //   const SnackBar(content: Text('Failed to load vendor data. Please try again later.')),
      // );
      setState(() {
        _isLoading = false; // Hide loading indicator if there's an error
      });
    }
  }
  @override
  void dispose() {
    _controller.dispose();
    _chargesController?.dispose(); // No need for null check since it's not nullable
    super.dispose();
  }

  void _refreshData() {
    _fetchVendorData();

    fetchChargesData(); // This will refresh the charges data
    fetchAmenitiesAndCharges(widget.vendorid); // Refresh amenities if needed
  }

  Future<Map<String, dynamic>> fetchAmenitiesAndCharges(String vendorId) async {
    final amenitiesUrl = Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId');

    try {
      final responses = await Future.wait([
        http.get(amenitiesUrl),
        // Add the charges URL here if you are fetching charges as well
        // http.get(chargesUrl), // Uncomment and define chargesUrl if needed
      ]);

      // Print the status codes of the responses
      for (var response in responses) {
        print('Response status: ${response.statusCode}');
        print('Response body: ${response.body}');
      }

      // Check if the first response (amenities) is successful
      if (responses[0].statusCode == 200) {
        final amenitiesData = json.decode(responses[0].body);
        print('Amenities Data: $amenitiesData'); // Log the amenities data

        // Parse amenities
        final amenitiesList = List<String>.from(amenitiesData['AmenitiesData']['amenities']);
        print('Parsed Amenities: $amenitiesList'); // Log parsed amenities

        // If you are fetching charges, ensure you have the second response
        // Uncomment the following lines if you are fetching charges
        // if (responses[1].statusCode == 200) {
        //   final chargesData = json.decode(responses[1].body);
        //   print('Charges Data: $chargesData'); // Log the charges data

        //   final charges = List<Services>.from(
        //     chargesData['vendor']['charges'].map((item) => Services.fromJson(item)),
        //   );

        //   return {
        //     'amenities': amenitiesList,
        //     'parkingCharges': charges,
        //   };
        // } else {
        //   throw Exception('Failed to fetch charges data');
        // }

        return {
          'amenities': amenitiesList,
          // 'parkingCharges': charges, // Uncomment if you are fetching charges
        };
      } else {
        throw Exception('Failed to fetch amenities data');
      }
    } catch (e) {
      print('Error: $e');
      throw Exception('Error fetching data: $e');
    }
  }
  bool isLoadingMinimumCharge = false; // Add this variable
  bool isLoading = true;
  String selectcar = 'Full Day'; // Initial mode
  String selectbike = 'Full Day'; // Initial mode
  String selectothers = 'Full Day'; // Initial mode

  bool carEnabled = false;
  bool bikeEnabled = false;
  bool othersEnabled = false;

  List<ParkingCharge> minimumCharges = [];
  // Car parking options
  bool carTemporary = false;
  bool carFullDay = false;
  bool carMonthly = false;

  // Bike parking options
  bool bikeTemporary = false;
  bool bikeFullDay = false;
  bool bikeMonthly = false;

  // Others parking options
  bool othersTemporary = false;
  bool othersFullDay = false;
  bool othersMonthly = false;

  void toggleParking(String vehicle, String type) {
    setState(() {
      if (vehicle == "Car") {
        if (type == "Temporary") {
          carTemporary = !carTemporary;
        } else if (type == "FullDay") {
          carFullDay = !carFullDay;
        } else if (type == "Monthly") {
          carMonthly = !carMonthly;
        }
      } else if (vehicle == "Bike") {
        if (type == "Temporary") {
          bikeTemporary = !bikeTemporary;
        } else if (type == "FullDay") {
          bikeFullDay = !bikeFullDay;
        } else if (type == "Monthly") {
          bikeMonthly = !bikeMonthly;
        }
      } else if (vehicle == "Others") {
        if (type == "Temporary") {
          othersTemporary = !othersTemporary;
        } else if (type == "FullDay") {
          othersFullDay = !othersFullDay;
        } else if (type == "Monthly") {
          othersMonthly = !othersMonthly;
        }
      }
    });

    // Call the update function to save the changes
    updateEnabledVehicles();
  }
  void toggleVehicle(String type) {
    setState(() {
      if (type == "Car") {
        carEnabled = !carEnabled;
        if (!carEnabled) {
          carTemporary = false;
          carFullDay = false;
          carMonthly = false;
        }
      } else if (type == "Bike") {
        bikeEnabled = !bikeEnabled;
        if (!bikeEnabled) {
          bikeTemporary = false;
          bikeFullDay = false;
          bikeMonthly = false;
        }
      } else if (type == "Others") {
        othersEnabled = !othersEnabled;
        if (!othersEnabled) {
          othersTemporary = false;
          othersFullDay = false;
          othersMonthly = false;
        }
      }

      // Reset selecedIndex when changing vehicle types
      selecedIndex = 0;
      _initializeTabController();
    });

    updateEnabledVehicles().then((_) {
      fetchEnabledVehicles();
    });
  }
  Future<void> updateEnabledVehicles() async {
    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}vendor/updateenable/${widget.vendorid}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "carEnabled": carEnabled,
          "bikeEnabled": bikeEnabled,
          "othersEnabled": othersEnabled,
          "carTemporary": carTemporary,
          "bikeTemporary": bikeTemporary,
          "othersTemporary": othersTemporary,
          "carFullDay": carFullDay,
          "bikeFullDay": bikeFullDay,
          "othersFullDay": othersFullDay,
          "carMonthly": carMonthly,
          "bikeMonthly": bikeMonthly,
          "othersMonthly": othersMonthly,
        }),
      );

      if (response.statusCode == 200) {
        print('Update successful');
      } else {
        print('Failed to update: ${response.body}');
      }
    } catch (e) {
      print('Error updating enabled vehicles: $e');
    }
  }
  List<ParkingbikeCharge> minimumbikeCharges = [];
  List<ParkingotherCharge> minimumotherCharges = [];
  List<ParkingCharge> additionalCharges = [];
  List<ParkingbikeCharge> additionalbikeCharges = [];
  List<ParkingotherCharge> additionalotherCharges = [];
  List<ParkingCharge> fulldaycharge = [];
  List<ParkingbikeCharge> fulldaybikecharge = [];
  List<ParkingotherCharge> fulldayothercharge = [];
  List<ParkingbikeCharge> monthlybikecharge = [];
  List<ParkingotherCharge> monthlyothercharge = [];
  List<ParkingCharge> monthlycharge = [];
  List<Map<String, dynamic>> parkingEntries = [];
  final List<String> parkingTypes = [
    '0 to 1 hour',
    '0 to 2 hours',
    '0 to 3 hours',
    '0 to 4 hours',
  ];
  final List<String> addcharge = [
    'Additional 1 hour',
    'Additional 2 hours',
    'Additional 3 hours',
    'Additional 4 hours',
  ];
  final List<String> fullday = [

    'Full day'];
  final List<String> monthly = [

    'Monthly'];
  Future<void> fetchMinimumCharge(String vendorId) async {
    setState(() {
      isLoadingMinimumCharge = true; // Start loading
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingCharge> charges = List<ParkingCharge>.from(
            data['vendor']['charges'].map((item) => ParkingCharge.fromJson(item)),
          );

          setState(() {
            minimumCharges = charges
                .where((charge) => charge.category == 'Car' && parkingTypes.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No minimum charges found");
        }
      } else {
        // showSnackBar("Failed to load minimum charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoadingMinimumCharge = false; // Stop loading
      });
    }
  }
  Future<void> fetchbikeMinimumCharge(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      print('Fetching data from: $url'); // Print the URL
      final response = await http.get(url);
      print('Response status: ${response.statusCode}'); // Print response status code

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data'); // Print raw data

        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          print('Vendor charges found'); // Confirm vendor charges are found
          List<ParkingbikeCharge> chargess = List<ParkingbikeCharge>.from(
            data['vendor']['charges'].map((item) => ParkingbikeCharge.fromJson(item)),
          );

          print('Total charges fetched: ${chargess.length}'); // Print total charges count

          setState(() {
            minimumbikeCharges = chargess
                .where((charges) => charges.category == 'Bike' && parkingTypes.contains(charges.type))
                .toList();
            print('Filtered charges: $minimumbikeCharges'); // Print filtered charges
          });
        } else {
          print('No charges found in vendor data'); // Log if no charges exist
          showSnackBar("No minimum charges found");
        }
      } else {
        print('Failed to load charges. Status code: ${response.statusCode}'); // Log failure
        // showSnackBar("Failed to load minimum charges");
      }
    } catch (e) {
      print('Error occurred: $e'); // Print error message
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
      print('Loading completed'); // Indicate loading is complete
    }
  }
  Future<void> fetchotherMinimumCharge(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      print('Fetching data from: $url'); // Print the URL
      final response = await http.get(url);
      print('Response status: ${response.statusCode}'); // Print response status code

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data'); // Print raw data

        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          print('Vendor charges found'); // Confirm vendor charges are found
          List<ParkingotherCharge> chargesss = List<ParkingotherCharge>.from(
            data['vendor']['charges'].map((item) => ParkingotherCharge.fromJson(item)),
          );

          print('Total charges fetched: ${chargesss.length}'); // Print total charges count

          setState(() {
            minimumotherCharges = chargesss
                .where((charges) => charges.category == 'Others' && parkingTypes.contains(charges.type))
                .toList();
            print('Filtered charges: $minimumbikeCharges'); // Print filtered charges
          });
        } else {
          print('No charges found in vendor data'); // Log if no charges exist
          showSnackBar("No minimum charges found");
        }
      } else {
        print('Failed to load charges. Status code: ${response.statusCode}'); // Log failure
        // showSnackBar("Failed to load minimum charges");
      }
    } catch (e) {
      print('Error occurred: $e'); // Print error message
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
      print('Loading completed'); // Indicate loading is complete
    }
  }
  Future<void> fetchAdditionalCharge(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingCharge> charges = List<ParkingCharge>.from(
            data['vendor']['charges'].map((item) => ParkingCharge.fromJson(item)),
          );

          setState(() {
            additionalCharges = charges
                .where((charge) => charge.category == 'Car' && addcharge.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchbikeAdditionalCharge(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingbikeCharge> chargess = List<ParkingbikeCharge>.from(
            data['vendor']['charges'].map((item) => ParkingbikeCharge.fromJson(item)),
          );

          setState(() {
            additionalbikeCharges = chargess
                .where((charge) => charge.category == 'Bike' && addcharge.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchotherAdditionalCharge(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingotherCharge> chargesss = List<ParkingotherCharge>.from(
            data['vendor']['charges'].map((item) => ParkingotherCharge.fromJson(item)),
          );

          setState(() {
            additionalotherCharges = chargesss
                .where((charge) => charge.category == 'Others' && addcharge.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchfulldaycar(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingCharge> charges = List<ParkingCharge>.from(
            data['vendor']['charges'].map((item) => ParkingCharge.fromJson(item)),
          );

          setState(() {
            fulldaycharge = charges
                .where((charge) => charge.category == 'Car' && fullday.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchbikefulldaycar(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingbikeCharge> chargess = List<ParkingbikeCharge>.from(
            data['vendor']['charges'].map((item) => ParkingbikeCharge.fromJson(item)),
          );

          setState(() {
            fulldaybikecharge = chargess
                .where((charge) => charge.category == 'Bike' && fullday.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchotherfulldaycar(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingotherCharge> chargesss = List<ParkingotherCharge>.from(
            data['vendor']['charges'].map((item) => ParkingotherCharge.fromJson(item)),
          );

          setState(() {
            fulldayothercharge = chargesss
                .where((charge) => charge.category == 'Others' && fullday.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchfulldaymonthly(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingCharge> charges = List<ParkingCharge>.from(
            data['vendor']['charges'].map((item) => ParkingCharge.fromJson(item)),
          );

          setState(() {
            monthlycharge = charges
                .where((charge) => charge.category == 'Car' && monthly.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchbikefulldaymonthly(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingbikeCharge> chargess = List<ParkingbikeCharge>.from(
            data['vendor']['charges'].map((item) => ParkingbikeCharge.fromJson(item)),
          );

          setState(() {
            monthlybikecharge = chargess
                .where((charge) => charge.category == 'Bike' && monthly.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  Future<void> fetchotherfulldaymonthly(String vendorId) async {
    setState(() {
      isLoading = true;
    });

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/getchargesdata/$vendorId');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['vendor'] != null && data['vendor']['charges'] != null) {
          List<ParkingotherCharge> chargesss = List<ParkingotherCharge>.from(
            data['vendor']['charges'].map((item) => ParkingotherCharge.fromJson(item)),
          );

          setState(() {
            monthlyothercharge = chargesss
                .where((charge) => charge.category == 'Others' && monthly.contains(charge.type))
                .toList();
          });
        } else {
          showSnackBar("No additional charges found");
        }
      } else {
        // showSnackBar("Failed to load additional charges");
      }
    } catch (e) {
      showSnackBar("Error: $e");
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  void showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
  IconData _getAmenityIcon(String amenity) {
    switch (amenity.toLowerCase()) {
      case "open parking":
        return Icons.local_parking;
      case "gated parking":
        return Icons.lock;
      case "charging":
        return Icons.electric_car;
      case "covered parking":
        return Icons.garage;
      case "cctv":
        return Icons.videocam;
      case "atms":
        return Icons.atm;
      case "wi-fi":
        return Icons.wifi;
      case "self car wash":
        return Icons.local_car_wash;
      case "restroom":
        return Icons.wc;
      case "security":
        return Icons.security;
      default:
        return Icons.help_outline; // Default icon for unknown amenities
    }
  }


  void _navigateToEditProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => editvendorprofile(
          vendorid: widget.vendorid,
          onEditSuccess: _refreshData, // Pass refresh callback
        ),
      ),
    ).then((_) {
      _refreshData(); // Optional: Refresh again when returning
    });
  }
  @override
  Widget build(BuildContext context) {

    return Scaffold(backgroundColor: ColorUtils.secondarycolor(),
      appBar: AppBar(automaticallyImplyLeading: false,
        title:  Text("Manage Parking Area", style:   GoogleFonts.poppins(color: Colors.black,
            fontSize: 18
        ),

        ),

        backgroundColor: ColorUtils.secondarycolor(),
        actions: [
          CircleAvatar(
            radius: 15,
            backgroundColor: ColorUtils.primarycolor(),
            child: IconButton(
              icon: const Icon(Icons.edit, size: 12, color: Colors.white),

              onPressed: _navigateToEditProfile,
            ),
          ),
          const SizedBox(width: 15,),
        ],
      ),

      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: SizedBox(
              width: double.infinity,
              child: CustomSlidingSegmentedControl<int>(
                initialValue: selectedTabIndex,
                isStretch: true,
                children: {
                  0: DefaultTextStyle.merge(
                    style: const TextStyle(color: Colors.black),
                    child: Text('Slots',style: GoogleFonts.poppins( // Replace with your preferred font
                      fontSize: 16,
                      // fontWeight: FontWeight.bold,
                    ),
                    ),
                  ),
                  1: DefaultTextStyle.merge(
                    style: const TextStyle(color: Colors.black),
                    child: Text('Charges',style: GoogleFonts.poppins( // Replace with your preferred font
                      fontSize: 16,
                      // fontWeight: FontWeight.bold,
                    ),),
                  ),
                  2: DefaultTextStyle.merge(
                    style: const TextStyle(color: Colors.black),
                    child: Text('Amenities',style: GoogleFonts.poppins( // Replace with your preferred font
                      fontSize: 16,
                      // fontWeight: FontWeight.bold,
                    ),),
                  ),
                },
                onValueChanged: (value) {
                  setState(() {
                    selectedTabIndex = value;
                  });
                },
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                thumbDecoration: BoxDecoration(
                  color:ColorUtils.secondarycolor(), // Background of selected tab
                  borderRadius: BorderRadius.circular(6),
                ),
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInToLinear,
              ),
            ),
          ),


          Expanded(
            child: IndexedStack(
              index: selectedTabIndex,
              children: [
                buildFirstTabContent(), // Define this function
                buildSecondTabContent(), // Define this function
                buildThirdTabContent(), // Define this function
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavBar(
        selectedIndex: _selecteddIndex,
        onTabChange: _onTabChange,
        menuImageUrl: _menuImageUrl,
      ),

    );
  }

  Widget buildFirstTabContent() {
    // Build your first tab content here
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                buildInfoCard(),
                buildbookedslot(),
                buildavailableslot(),
              ],
            ),
            const SizedBox(height: 10,),
            Container(
              padding: const EdgeInsets.only(),
              decoration: BoxDecoration(
                border: Border.all(color: ColorUtils.primarycolor(), width: 0.5,),

                borderRadius: BorderRadius.circular(10),

                color: Colors.white,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [


                    ],
                  ),
                  const SizedBox(height: 8),

                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(width: 8),
                      Align(
                        alignment: Alignment.center,
                        child: Stack(
                          alignment: Alignment.bottomRight,
                          children: [
                            CircleAvatar(
                              radius: 34,
                              backgroundColor: Colors.grey[300],
                              backgroundImage: _selectedImage != null
                                  ? FileImage(_selectedImage!)
                                  : (_vendor?.image.isNotEmpty ?? false
                                  ? NetworkImage(_vendor!.image)
                                  : null),
                              child: _selectedImage == null && (_vendor?.image.isEmpty ?? true)
                                  ? const Icon(Icons.person, size: 30, color: Colors.black54)
                                  : null,
                            ),

                            // CircleAvatar(
                            //   radius: 15,
                            //   backgroundColor: ColorUtils.primarycolor(),
                            //   child: IconButton(
                            //     icon: const Icon(Icons.edit, size: 12, color: Colors.white),
                            //
                            //     onPressed: ()
                            //     {
                            //       Navigator.push(
                            //         context,
                            //         MaterialPageRoute(
                            //           builder: (context) => editvendorprofile(vendorid: widget.vendorid),
                            //         ),
                            //       );
                            //     }, // Select image from gallery
                            //   ),
                            // ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [


                            const SizedBox(height: 5),
                            Row(
                              children: [
                                Text(
                                  'Address:',
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    color: Colors.grey[800],
                                  ),
                                ),
                                const SizedBox(width: 8), // Adds spacing between the label and the address
                                Expanded(
                                  child: Text(
                                    _vendor?.address ?? '',
                                    style:  GoogleFonts.poppins(
                                      fontSize: 14,
                                      color: Colors.grey[800],
                                    ),
                                    overflow: TextOverflow.ellipsis, // Handles overflow with ellipsis
                                    maxLines: 5, // Ensures text stays in one line
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 5),
                            Row(
                              children: [
                                RichText(
                                  textAlign: TextAlign.center,
                                  text: TextSpan(
                                    text:   'Landmark:',
                                    style:  GoogleFonts.poppins(

                                      fontSize: 14,
                                      color: Colors.grey[800],
                                    ),
                                  ),
                                ),
                                RichText(
                                  textAlign: TextAlign.center,
                                  text: TextSpan(
                                    text:  _vendor?.landmark ?? '',
                                    style:  GoogleFonts.poppins(

                                      fontSize: 14,
                                      color: Colors.grey[800],
                                    ),
                                  ),
                                ),
                              ],
                            ),



                            const SizedBox(height: 15),
                          ],
                        ),
                      ),
                    ],
                  ),

                ],
              ),
            ),

            const SizedBox(height: 10),
            Container(
              child:  Text("Contact details",style:  GoogleFonts.poppins(fontSize: 16,fontWeight: FontWeight.bold),),
            ),
            const SizedBox(height: 10),
            ListView.builder(
              shrinkWrap: true,
              itemCount: _vendor?.contacts.length ?? 0, // Use _vendor?.contacts.length
              itemBuilder: (context, index) {
                final contact = _vendor!.contacts[index]; // Get the contact from _vendor
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 1,
                        child: TextFormField(
                          initialValue: contact.name,
                          readOnly: true,
                          style:  GoogleFonts.poppins(color: Colors.black),
                          decoration: InputDecoration(
                            labelText: 'Contact Person',
                            labelStyle:  GoogleFonts.poppins(
                              color: ColorUtils.primarycolor(),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                            contentPadding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 12.0),
                            hintStyle:  GoogleFonts.poppins(
                              color: Colors.grey,
                              fontSize: 11,

                            ),
                            border: const OutlineInputBorder(),
                            focusedBorder: OutlineInputBorder(
                              borderSide: BorderSide(color: ColorUtils.primarycolor(),    width: 0.5,),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderSide: BorderSide(color: ColorUtils.primarycolor(),    width: 0.5,),

                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        flex: 1,
                        child: TextFormField(
                          initialValue: contact.mobile,
                          readOnly: true,
                          style:  GoogleFonts.poppins(color: Colors.black),
                          decoration: InputDecoration(
                            labelText: 'Contact Number',
                            labelStyle:  GoogleFonts.poppins(
                              color: ColorUtils.primarycolor(),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                            contentPadding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 12.0),
                            hintStyle:  GoogleFonts.poppins(
                              color: Colors.grey,
                              fontSize: 11,
                            ),
                            border: const OutlineInputBorder(),
                            focusedBorder: OutlineInputBorder(
                              borderSide: BorderSide(color: ColorUtils.primarycolor(),    width: 0.5,),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderSide: BorderSide(color: ColorUtils.primarycolor(),    width: 0.5,),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 2),

                    ],
                  ),
                );
              },
            ),
// Container(
//     child: Text(_vendor?.latitude ??""),
// ),
//             Container(
//               child: Text(_vendor?.longitude ??""),
//             ),         const SizedBox(height: 10),
            Container(
              child:  Text("Location details",style: GoogleFonts.poppins(fontSize: 16,fontWeight: FontWeight.bold),),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 0.0),
              child: Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  border: Border.all(color: ColorUtils.primarycolor()),
                  borderRadius: BorderRadius.circular(5.0),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(5.0),
                  child: _vendor?.latitude == null || _vendor?.longitude == null
                      ? const Center(child: Text("Location data not available"))
                      : GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(
                        double.tryParse(_vendor!.latitude.trim()) ?? 0.0,
                        double.tryParse(_vendor!.longitude.trim()) ?? 0.0,
                      ),
                      zoom: 15,
                    ),
                    markers: {
                      Marker(
                        markerId: const MarkerId('vendor_location'),
                        position: LatLng(
                          double.tryParse(_vendor!.latitude.trim()) ?? 0.0,
                          double.tryParse(_vendor!.longitude.trim()) ?? 0.0,
                        ),
                        infoWindow: InfoWindow(
                          title: 'Vendor Location',
                          snippet: _vendor?.address ?? '',
                        ),
                      ),
                    },
                    onMapCreated: (GoogleMapController controller) {
                      // Optional: Store the controller for later use
                      // _mapController = controller;
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(height: 15,),
            Container(
              child:  Text("Business Hours",style: GoogleFonts.poppins(fontSize: 16,fontWeight: FontWeight.bold),),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(
                        horizontal: 14.0, vertical: 4.0),
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
                              child: Text(dayData['day'],
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w500,
                                      fontSize: 12,
                                      color: Colors.black87)),
                            ),
                            Expanded(
                              flex: 3,
                              child: dayData['isClosed']
                                  ? _statusLabel(
                                  'Closed', Colors.red)
                                  : dayData['is24Hours']
                                  ? _statusLabel('24 Hours',
                                  Colors.green)
                                  : _styledBox(
                                  dayData['openTime']),
                            ),
                            if (!dayData['isClosed'] &&
                                !dayData['is24Hours'])
                              const SizedBox(width: 8.0),
                            if (!dayData['isClosed'] &&
                                !dayData['is24Hours'])
                              Expanded(
                                flex: 3,
                                child: _styledBox(dayData['closeTime']),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),

                ],
              ),
            ),


          ],
        ),
      ),
    );
  }

  Widget _buildVehicleSwitch(String label, bool value, String vehicleType) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 0),
        AnimatedToggleSwitch<bool>.dual(
          current: value,
          first: false,
          second: true,
          borderWidth: 1.0,
          height: 24.0,
          spacing: 15.0,
          styleBuilder: (val) => ToggleStyle(
            backgroundColor: val ? Colors.black : Colors.black,
            borderColor: Colors.grey.shade400,
            indicatorColor: val ?  ColorUtils.primarycolor() : Colors.red,
          ),
          onChanged: (val) {
            toggleVehicle(vehicleType);
            updateEnabledVehicles();
          },
          iconBuilder: (val) => Icon(
            val ? Icons.power : Icons.power_settings_new_outlined,
            color: Colors.white,
            size: 16,
          ),
          textBuilder: (val) => Text(
            val ? "ON" : 'OFF',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildParkingOptions(String vehicleType, bool temp, bool full, bool monthly) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildParkingSwitch(vehicleType, "Temporary", temp),
        _buildParkingSwitch(vehicleType, "FullDay", full),
        _buildParkingSwitch(vehicleType, "Monthly", monthly),
      ],
    );
  }


  Widget _buildParkingSwitch(String vehicle, String type, bool value) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 5,),
        Text(
          type, // heading text
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 0),
        AnimatedToggleSwitch<bool>.dual(
          current: value,
          first: false,
          second: true,
          borderWidth: 1.0,
          height: 24.0,
          spacing: 15.0,
          styleBuilder: (val) => ToggleStyle(
            backgroundColor: val ? Colors.black : Colors.black,
            borderColor: Colors.grey.shade400,
            indicatorColor: val ?  ColorUtils.primarycolor() : Colors.red,
          ),
          onChanged: (val) {
            if (val != value) {
              toggleParking(vehicle, type);
            }
          },
          iconBuilder: (val) => Icon(
            val ? Icons.power : Icons.power_settings_new_outlined,
            color: Colors.white,
            size: 16,
          ),
          textBuilder: (val) => Text(
            val ? "ON" : 'OFF',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }


// Modified _geTabs() to only show enabled vehicle tabs
  List<Widget> _geTabs() {
    final enabledTypes = getEnabledVehicleTypes();
    if (enabledTypes.isEmpty) return [];
    return enabledTypes.asMap().entries.map((entry) {
      final index = entry.key;
      final type = entry.value;

      IconData icon;
      String label;

      switch (type) {
        case 'Car':
          icon = Icons.drive_eta;
          label = 'Cars';
          break;
        case 'Bike':
          icon = Icons.pedal_bike;
          label = 'Bikes';
          break;
        case 'Others':
          icon = Icons.miscellaneous_services;
          label = 'Others';
          break;
        default:
          icon = Icons.help_outline;
          label = 'Unknown';
      }

      final isSelecte = selecedIndex == index;

      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: isSelecte ? Colors.black : Colors.white,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: GoogleFonts.poppins(
              color: isSelecte ? Colors.black : Colors.white,
            ),
          ),
        ],
      );
    }).toList();
  }
  Widget buildSecondTabContent() {
    final enabledTypes = getEnabledVehicleTypes();



    // Build your second tab content here
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildVehicleSwitch("Car", carEnabled, "Car"),
            const SizedBox(width: 7,),
            _buildVehicleSwitch("Bike", bikeEnabled, "Bike"),
            const SizedBox(width: 7,),
            _buildVehicleSwitch("Others", othersEnabled, "Others"),

          ],
        ),
        const SizedBox(height: 10,),
        if (enabledTypes.isNotEmpty && _chargesController != null) // Only show TabContainer if at least one vehicle is enabled
          Container(
            decoration: BoxDecoration(
              color: ColorUtils.primarycolor(),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white,
                width: 2.0,
              ),
            ),
            child: TabContainer(
              controller: _chargesController,
              borderRadius: BorderRadius.circular(20),
              tabEdge: TabEdge.top,
              curve: Curves.easeIn,
              transitionBuilder: (child, animation) {
                animation = CurvedAnimation(curve: Curves.easeIn, parent: animation);
                return SlideTransition(
                  position: Tween(
                    begin: const Offset(0.2, 0.0),
                    end: const Offset(0.0, 0.0),
                  ).animate(animation),
                  child: FadeTransition(
                    opacity: animation,
                    child: child,
                  ),
                );
              },
              colors: List.filled(enabledTypes.length, Colors.white),
              selectedTextStyle: GoogleFonts.poppins(
                fontSize: 15.0,
                color: ColorUtils.primarycolor(),
              ),
              unselectedTextStyle: GoogleFonts.poppins(
                fontSize: 13.0,
                color: Colors.black,
              ),
              tabs: _geTabs(),
              children: enabledTypes.map((type) {
                switch (type) {
                  case 'Car':
                    return _buildCarTabContent();
                  case 'Bike':
                    return _buildBikeTabContent();
                  case 'Others':
                    return _buildOthersTabContent();
                  default:
                    return Container(); // Fallback
                }
              }).toList(),
            ),
          )
        else
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text("Please enable at least one vehicle type"),
          ),
      ],
    );
  }
  Widget buildThirdTabContent() {
    // Build your third tab content here
    return FutureBuilder<AmenitiesAndParking>(
      future: fetchAmenitiesAndParking(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return  Center(
            child: LoadingAnimationWidget.staggeredDotsWave(
              color:  ColorUtils.primarycolor(),
              size: 50,
            ),

          );
        } else if (snapshot.hasError) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Row(
                  children: [
                    Text(
                      "Amenities:",
                      style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 8), // Adds some space between text and icon
                    GestureDetector(
                      onTap: (){
                        Navigator.push( context, MaterialPageRoute( builder: (context) => Addamenties( vendorid: widget.vendorid, onEditSuccess: () { setState(() { selectedTabIndex = 2; // Change to the third tab
                        }); }, ), ), );
                      },
                      child: Container(

                        // Set the background color
                        decoration: BoxDecoration(
                          color: Colors.white, // Background color

                          borderRadius: BorderRadius.circular(30), // Circular border radius
                        ),
                        child: const Icon(
                          Icons.edit,
                          color: Colors.black, // Icon color
                          size: 20,
                        ),
                      ),
                    ), // Pencil icon
                  ],
                ),
              ),
              const SizedBox(height: 100,),
              Column(children: [
                const SizedBox(height: 150,),
                Container(
                  child: const Text("No Amenities Found"),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => Addamenties(
                          vendorid: widget.vendorid,
                          onEditSuccess: () {
                            setState(() {
                              selectedTabIndex = 2; // Change to the third tab
                            });
                          },
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ColorUtils.primarycolor(),
                    // foregroundColor: ,

                    minimumSize: const Size(100, 35), // Width and height (recommended height ~44)
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5), // Your preferred radius

                    ),
                    // shadowColor: Colors.black.withOpacity(0.2),
                  ),
                  child: Text(
                    "Add Amenities",
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                    ),
                  ),
                ),

              ],

              ),


            ],
          );
        } else if (snapshot.hasData) {
          final amenities = snapshot.data!.amenities; // List<String>
          final services = snapshot.data!.services; // List<Services>

          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  // Row(mainAxisAlignment: MainAxisAlignment.end,
                  //   children: [
                  //
                  //     SizedBox(
                  //       width: 130, // Adjust width as needed
                  //       child:  ElevatedButton(
                  //         onPressed: () {
                  //
                  //           Navigator.push(
                  //             context,
                  //             MaterialPageRoute(
                  //               builder: (context) => Editamenities(
                  //                 vendorid: widget.vendorid,
                  //                 onEditSuccess: () {
                  //                   setState(() {
                  //                     selectedTabIndex = 2; // Change to the third tab
                  //                   });
                  //                 },
                  //               ),
                  //             ),
                  //           );
                  //         },
                  //         style: ElevatedButton.styleFrom(
                  //           backgroundColor: ColorUtils.primarycolor(),
                  //           foregroundColor: Colors.white,
                  //           shape: RoundedRectangleBorder(
                  //             borderRadius: BorderRadius.circular(5),
                  //           ),
                  //           padding: const EdgeInsets.symmetric(vertical: 5.0, horizontal: 14.0), // Reduced vertical padding
                  //           minimumSize: const Size(0, 36), // Optional: ensure the minimum height is reduced
                  //         ),
                  //         child: Row(
                  //           mainAxisAlignment: MainAxisAlignment.center,
                  //           children: [
                  //             Container(
                  //
                  //               // Set the background color
                  //               decoration: BoxDecoration(
                  //                 color: Colors.white, // Background color
                  //
                  //                 borderRadius: BorderRadius.circular(30), // Circular border radius
                  //               ),
                  //               child: const Icon(
                  //                 Icons.edit,
                  //                 color: Colors.black, // Icon color
                  //                 size: 20,
                  //               ),
                  //             ),
                  //
                  //             const SizedBox(width: 3.0), // Space between icon and text
                  //             //  Text(
                  //             //   'Edit Amenities',
                  //             //   style: GoogleFonts.poppins(
                  //             //     fontSize: 11,
                  //             //     color: Colors.white, // Correctly setting the text color
                  //             //   ),
                  //             // ),
                  //
                  //           ],
                  //         ),
                  //       ),
                  //     ),
                  //   ],
                  // ),
                  Row(
                    children: [
                      Text(
                        "Amenities:",
                        style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 8), // Adds some space between text and icon
                      GestureDetector(
                        onTap: (){
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => Editamenities(
                                vendorid: widget.vendorid,
                                onEditSuccess: () {
                                  setState(() {
                                    selectedTabIndex = 2; // Change to the third tab
                                  });
                                },
                              ),
                            ),
                          );
                        },
                        child: Container(

                          // Set the background color
                          decoration: BoxDecoration(
                            color: Colors.white, // Background color

                            borderRadius: BorderRadius.circular(30), // Circular border radius
                          ),
                          child: const Icon(
                            Icons.edit,
                            color: Colors.black, // Icon color
                            size: 20,
                          ),
                        ),
                      ), // Pencil icon
                    ],
                  ),

                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8.0,
                    runSpacing: 8.0,
                    children: amenities.map((amenity) {

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                            color:  Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow:
                            const [
                              BoxShadow(
                                color: Colors.black26,
                                blurRadius: 6.0,
                                offset: Offset(0, 2),
                              ),
                            ]

                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getAmenityIcon(amenity),
                              color:  ColorUtils.primarycolor() ,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              amenity,
                              style:  GoogleFonts.poppins(
                                color:   ColorUtils.primarycolor() ,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,

                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),

                  // ...amenities.map((a) => Text(a)).toList(), // Directly display the string
                  // Align(
                  //   alignment: Alignment.centerRight,
                  //   child: SizedBox(
                  //     width: 130, // Adjust width as needed
                  //     child: ElevatedButton(
                  //       onPressed: () {
                  //         Navigator.push(
                  //           context,
                  //           MaterialPageRoute(
                  //             builder: (context) => editParkingPage(       onEditSuccess: () {
                  //               setState(() {
                  //                 selectedTabIndex = 2; // Change to the third tab
                  //               });
                  //             },vendorId:widget.vendorid, ),
                  //           ),
                  //         );
                  //       },
                  //       style: ElevatedButton.styleFrom(
                  //         backgroundColor: ColorUtils.primarycolor(),
                  //         foregroundColor: Colors.white,
                  //         shape: RoundedRectangleBorder(
                  //           borderRadius: BorderRadius.circular(5),
                  //         ),
                  //         padding: const EdgeInsets.symmetric(vertical: 5.0, horizontal: 14.0), // Adjust padding
                  //         minimumSize: const Size(0, 36), // Ensure the minimum height is reduced
                  //       ),
                  //       child: Row(
                  //         mainAxisAlignment: MainAxisAlignment.center,
                  //         children: [
                  //           Container(
                  //             // Set the background color for the icon
                  //             decoration: BoxDecoration(
                  //               color: Colors.white, // Background color
                  //               borderRadius: BorderRadius.circular(30), // Circular border radius
                  //             ),
                  //             child: const Icon(
                  //               Icons.edit,
                  //               color: Colors.black, // Icon color
                  //               size: 20,
                  //             ),
                  //           ),
                  //           const SizedBox(width: 3.0), // Space between icon and text
                  //            Text(
                  //             'Edit Services',
                  //             style:  GoogleFonts.poppins(
                  //               fontSize: 11,
                  //               color: Colors.white, // Correctly setting the text color
                  //             ),
                  //           ),
                  //         ],
                  //       ),
                  //     ),
                  //   ),
                  // ),
                  Row(
                    children: [
                      Text(
                        "Additional Services:",
                        style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 8), // Adds some space between text and icon
                      GestureDetector(
                        onTap: (){
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => editParkingPage(       onEditSuccess: () {
                                setState(() {
                                  selectedTabIndex = 2; // Change to the third tab
                                });
                              },vendorId:widget.vendorid, ),
                            ),
                          );
                        },
                        child: Container(

                          // Set the background color
                          decoration: BoxDecoration(
                            color: Colors.white, // Background color

                            borderRadius: BorderRadius.circular(30), // Circular border radius
                          ),
                          child: const Icon(
                            Icons.edit,
                            color: Colors.black, // Icon color
                            size: 20,
                          ),
                        ),
                      ), // Pencil icon
                    ],
                  ),

                  // Align(
                  //   alignment: Alignment.centerLeft, // Aligns content to the left
                  //   child: Text(
                  //     "Additional Services:",
                  //     style:  GoogleFonts.poppins(fontSize: 16,fontWeight: FontWeight.bold),
                  //   ),
                  // ),
                  const SizedBox(height: 10),
                  // Heading Card
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Column(
                      children: [
                        // Bold Heading Card
                        SizedBox(
                          width: double.infinity, // or a specific width, e.g., 300
                          height: 40, // set a specific height for the heading card
                          child: Card(
                            color: Colors.white, // Set the Card color explicitly
                            child:  Padding(
                              padding: const EdgeInsets.all(5.0),
                              child: Row(
                                children: [
                                  // Heading for Serial Number
                                  Expanded(
                                    flex: 1,
                                    child: Text(
                                      "S.No", // Heading text
                                      style:  GoogleFonts.poppins(
                                        fontSize: 14,color:  ColorUtils.primarycolor() ,
                                        fontWeight: FontWeight.bold, // Make it bold
                                      ),
                                      textAlign: TextAlign.center, // Center the heading
                                    ),
                                  ),
                                  // Heading for Service Type
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      "Services", // Heading text
                                      style:  GoogleFonts.poppins(
                                        fontSize: 14,color: ColorUtils.primarycolor() ,
                                        fontWeight: FontWeight.bold, // Make it bold
                                      ),
                                      textAlign: TextAlign.center, // Center the heading
                                    ),
                                  ),
                                  // Heading for Amount
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      "Amount", // Heading text
                                      style: GoogleFonts.poppins(
                                        fontSize: 14,color:  ColorUtils.primarycolor() ,
                                        fontWeight: FontWeight.bold, // Make it bold
                                      ),
                                      textAlign: TextAlign.center, // Center the heading
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Loop through the services list
                  ...services.asMap().map(
                        (index, s) => MapEntry(
                      index,
                      Column(
                        children: [
                          // Content Card
                          SizedBox(
                            width: double.infinity, // or a specific width, e.g., 300
                            height: 40, // set a specific height for the card
                            child: Card(
                              color: Colors.white, // Set the Card color explicitly
                              child: Row(
                                children: [
                                  // Serial Number (index + 1)
                                  Expanded(
                                    flex: 1,
                                    child: Text(
                                      "${index + 1}.", // Serial number starts from 1
                                      style:  GoogleFonts.poppins(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold, // Make it bold
                                      ),
                                      textAlign: TextAlign.center, // Align to center
                                    ),
                                  ),
                                  // Service Type
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      s.type,
                                      style:  GoogleFonts.poppins(
                                        fontSize: 14,
                                      ),
                                      textAlign: TextAlign.center, // Align to center
                                    ),
                                  ),
                                  // Amount
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      "₹${s.amount}",
                                      style:  GoogleFonts.poppins(
                                        fontSize: 14,
                                      ),
                                      textAlign: TextAlign.center, // Align to center
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).values,






                ],
              ),
            ),
          );
        } else {
          return const Text("No data found.");
        }
      },
    );
  }
  void _onTabChange(int index) {
    _navigateToPage(index);
  }

  Widget _buildCarTabContent() {
    return        SingleChildScrollView(
      child: Padding(

        padding: const EdgeInsets.all(5.0),
        child:  isLoading // Check if loading
            ? Center(
          child: Padding(
            padding: const EdgeInsets.all(40.0),
            child: Image.asset('assets/gifload.gif',),
          ),
        )
            :Column(
          children: [



            if (carEnabled) _buildParkingOptions("Car", carTemporary, carFullDay, carMonthly),
            if (carEnabled &  carTemporary) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2.0),
                child: Row(
                  children: [
                    // First Container: Minimum Charges
                    Expanded(
                      child: GestureDetector(
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => addcarminimumcharge(
                              onEditSuccess: () {
                                selecedIndex = 0;
                              },
                              vendorid: widget.vendorid,
                            )),
                          );
                          _refreshData();
                        },
                        child: Container(
                          height: 120,
                          decoration: BoxDecoration(
                            color: ColorUtils.primarycolor(),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Minimum Charges",
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                minimumCharges.isNotEmpty ? minimumCharges[0].type : '',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: Colors.white,
                                child: minimumCharges.isNotEmpty
                                    ? Text(
                                  minimumCharges[0].amount,
                                  style: GoogleFonts.poppins(
                                    color: Colors.black,
                                    fontSize: 16,
                                  ),
                                )
                                    : IconButton(
                                  icon: const Icon(Icons.add_circle, color: Colors.black),
                                  onPressed: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (context) => addcarminimumcharge(
                                        onEditSuccess: () {
                                          selecedIndex = 0;
                                        },
                                        vendorid: widget.vendorid,
                                      )),
                                    );
                                    _refreshData();
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(width: 2), // Space between containers


                    Expanded(
                      child: GestureDetector(
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => addcaradditionalcharge(
                              onEditSuccess: () {
                                selecedIndex = 0;
                              },
                              vendorid: widget.vendorid,
                            )),
                          );
                          _refreshData();
                        },
                        child: Container(
                          height: 120,
                          decoration: BoxDecoration(
                            color: ColorUtils.primarycolor(),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Additional Charges",
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                additionalCharges.isNotEmpty ? additionalCharges[0].type : '',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: Colors.white,
                                child: additionalCharges.isNotEmpty
                                    ? Text(
                                  additionalCharges[0].amount,
                                  style: GoogleFonts.poppins(
                                    color: Colors.black,
                                    fontSize: 16,
                                  ),
                                )
                                    : IconButton(
                                  icon: const Icon(Icons.add_circle, color: Colors.black),
                                  onPressed: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (context) => addcaradditionalcharge(
                                        onEditSuccess: () {
                                          selecedIndex = 0;
                                        },
                                        vendorid: widget.vendorid,
                                      )),
                                    );
                                    _refreshData();
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            ],

            const SizedBox(height: 2,),

              if (carEnabled && carFullDay && !carMonthly) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.0),
                  child: Row(
                    children: [
                      // Full-Day Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addcarfullday(
                                    onEditSuccess: () {
                                      selecedIndex = 0; // Note: Typo in 'selecedIndex', should be 'selectedIndex'
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Full-Day Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: fulldaycharge.isNotEmpty
                                        ? Text(
                                      fulldaycharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : IconButton(
                                      icon: const Icon(Icons.add_circle, color: Colors.black),
                                      onPressed: () async {
                                        await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => addcarfullday(
                                              onEditSuccess: () {
                                                selecedIndex = 0;
                                              },
                                              vendorid: widget.vendorid,
                                            ),
                                          ),
                                        );
                                        _refreshData();
                                      },
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  AnimatedToggleSwitch<String>.dual(
                                    current: selectcar,
                                    first: 'Full Day',
                                    second: '24 Hours',
                                    spacing: 25.0,
                                    borderWidth: 1.0,
                                    height: 20,
                                    styleBuilder: (val) => ToggleStyle(
                                      backgroundColor: Colors.white,
                                      borderColor: Colors.grey.shade400,
                                      indicatorColor: Colors.red,
                                    ),
                                    textBuilder: (val) => Text(
                                      val,
                                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.black),
                                    ),
                                    iconBuilder: (val) => val == 'Full Day'
                                        ? const Icon(Icons.access_time, size: 16, color: Colors.black)
                                        : const Icon(Icons.calendar_today, size: 16, color: Colors.black),
                                    onChanged: (val) async {
                                      setState(() {
                                        selectcar = val;
                                      });
                                      final response = await http.put(
                                        Uri.parse('${ApiConfig.baseUrl}vendor/upadatefulldaycar/${widget.vendorid}'),
                                        headers: {'Content-Type': 'application/json'},
                                        body: jsonEncode({'fulldaycar': val}),
                                      );
                                      if (response.statusCode == 200) {
                                        print("Full day car mode updated successfully");
                                      } else {
                                        print("Failed to update full day car mode: ${response.body}");
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // White Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Add content here if needed
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (carEnabled && !carFullDay && carMonthly) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.0),
                  child: Row(
                    children: [
                      // Monthly Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addMonthlysubscription(
                                    onEditSuccess: () {
                                      selecedIndex = 0;
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Monthly Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: monthlycharge.isNotEmpty
                                        ? Text(
                                      monthlycharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : IconButton(
                                      icon: const Icon(Icons.add_circle, color: Colors.black),
                                      onPressed: () async {
                                        await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => addMonthlysubscription(
                                              onEditSuccess: () {
                                                selecedIndex = 0;
                                              },
                                              vendorid: widget.vendorid,
                                            ),
                                          ),
                                        );
                                        _refreshData();
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // White Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Add content here if needed
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (carEnabled && carFullDay && carMonthly) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.0),
                  child: Row(
                    children: [
                      // Full-Day Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addcarfullday(
                                    onEditSuccess: () {
                                      selecedIndex = 0;
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Full-Day Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: fulldaycharge.isNotEmpty
                                        ? Text(
                                      fulldaycharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : IconButton(
                                      icon: const Icon(Icons.add_circle, color: Colors.black),
                                      onPressed: () async {
                                        await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => addcarfullday(
                                              onEditSuccess: () {
                                                selecedIndex = 0;
                                              },
                                              vendorid: widget.vendorid,
                                            ),
                                          ),
                                        );
                                        _refreshData();
                                      },
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  AnimatedToggleSwitch<String>.dual(
                                    current: selectcar,
                                    first: 'Full Day',
                                    second: '24 Hours',
                                    spacing: 25.0,
                                    borderWidth: 1.0,
                                    height: 20,
                                    styleBuilder: (val) => ToggleStyle(
                                      backgroundColor: Colors.white,
                                      borderColor: Colors.grey.shade400,
                                      indicatorColor: Colors.red,
                                    ),
                                    textBuilder: (val) => Text(
                                      val,
                                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.black),
                                    ),
                                    iconBuilder: (val) => val == 'Full Day'
                                        ? const Icon(Icons.access_time, size: 16, color: Colors.black)
                                        : const Icon(Icons.calendar_today, size: 16, color: Colors.black),
                                    onChanged: (val) async {
                                      setState(() {
                                        selectcar = val;
                                      });
                                      final response = await http.put(
                                        Uri.parse('${ApiConfig.baseUrl}vendor/upadatefulldaycar/${widget.vendorid}'),
                                        headers: {'Content-Type': 'application/json'},
                                        body: jsonEncode({'fulldaycar': val}),
                                      );
                                      if (response.statusCode == 200) {
                                        print("Full day car mode updated successfully");
                                      } else {
                                        print("Failed to update full day car mode: ${response.body}");
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Monthly Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addMonthlysubscription(
                                    onEditSuccess: () {
                                      selecedIndex = 0;
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Monthly Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: monthlycharge.isNotEmpty
                                        ? Text(
                                      monthlycharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : IconButton(
                                      icon: const Icon(Icons.add_circle, color: Colors.black),
                                      onPressed: () async {
                                        await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => addMonthlysubscription(
                                              onEditSuccess: () {
                                                selecedIndex = 0;
                                              },
                                              vendorid: widget.vendorid,
                                            ),
                                          ),
                                        );
                                        _refreshData();
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],






          ],
        ),
      ),
    );


  }
  Widget _buildBikeTabContent() {
    return SingleChildScrollView(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(5.0),
            child:  isLoading // Check if loading
                ? Center(
              child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Image.asset('assets/gifload.gif',),
              ),
            )
                :Column(
              children: [

                // _buildVehicleSwitch("Bike", bikeEnabled, "Bike"),
                if (bikeEnabled) _buildParkingOptions("Bike", bikeTemporary, bikeFullDay, bikeMonthly),
                if (bikeEnabled &&bikeTemporary) ...[
                  Row(
                    children: [
                      // First Container wrapped with Expanded to fit the screen width
                      Expanded(
                        child: GestureDetector(
                          onTap: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => addbikeminimumcharge(
                                onEditSuccess: () {

                                  selecedIndex = 1; // This callback can be used if you want to perform actions on success
                                },
                                vendorid: widget.vendorid,
                              )),
                            );
                            // After returning, refresh the data
                            _refreshData();
                          },
                          child: Container(
                            height: 120, // Increased for the toggle switch
                            width: 170,
                            decoration: BoxDecoration(
                              color: ColorUtils.primarycolor(),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Minimum Charges",
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  minimumbikeCharges.isNotEmpty ? minimumbikeCharges[0].type : '',
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: Colors.white,
                                  child: minimumbikeCharges.isNotEmpty
                                      ? Text(
                                    minimumbikeCharges[0].amount,
                                    style:  GoogleFonts.poppins(
                                      color: Colors.black,
                                      fontSize: 16,
                                    ),
                                  )
                                      : GestureDetector(
                                    onTap: () async {
                                      await Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (context) => addbikeminimumcharge(
                                          onEditSuccess: () {

                                            selecedIndex = 1; // This callback can be used if you want to perform actions on success
                                          },
                                          vendorid: widget.vendorid,
                                        )),
                                      );
                                      // After returning, refresh the data
                                      _refreshData();
                                    },
                                    child: const IconButton(
                                      icon: Icon(
                                        Icons.add_circle,
                                        color: Colors.black,
                                      ),
                                      onPressed:null,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 2,),

                      // Second Container wrapped with Expanded to fit the screen width
                      Expanded(
                        child: GestureDetector(
                          onTap: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => addbikeadditionalcharge(
                                onEditSuccess: () {
                                  selecedIndex = 1; // This callback can be used if you want to perform actions on success
                                },
                                vendorid: widget.vendorid,
                              )),
                            );
                            // After returning, refresh the data
                            _refreshData();
                          },
                          child: Container(
                            height: 120, // Increased for the toggle switch
                            width: 170,
                            decoration: BoxDecoration(
                              color: ColorUtils.primarycolor(), // Change color if selected
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Additional Charges", // You can change the title dynamically
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                // Display the type of charge at the top
                                Text(
                                  " ${additionalbikeCharges.isNotEmpty ? additionalbikeCharges[0].type : ''}", // Display type or ' if no data
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),

                                // Display the amount below the type
                                // CircleAvatar with action button
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: Colors.white,
                                  child: additionalbikeCharges.isNotEmpty
                                      ? Text(
                                    additionalbikeCharges[0].amount,
                                    style: GoogleFonts.poppins(
                                      color: Colors.black,
                                      fontSize: 16,
                                    ),
                                  )
                                      : GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => addbikeadditionalcharge(
                                            onEditSuccess: () {
                                              selecedIndex = 1;
                                            },
                                            vendorid: widget.vendorid,
                                          ),                                      ),

                                      ).then((_) => _refreshData());
                                    },
                                    child: const Icon(
                                      Icons.add_circle,
                                      color: Colors.black,
                                    ),
                                  ),

                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 2,),
                Row(
                  children: [
                    if (bikeEnabled && bikeFullDay && !bikeMonthly) ...[
                      // Full-day Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addbikefullday(
                                    onEditSuccess: () {
                                      selecedIndex = 1; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Full-day Charges',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: fulldaybikecharge.isNotEmpty
                                        ? Text(
                                      fulldaybikecharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
                                  ),
                                  const SizedBox(height: 12),
                                  AnimatedToggleSwitch<String>.dual(
                                    current: selectbike,
                                    first: 'Full Day',
                                    second: '24 Hours',
                                    spacing: 25.0,
                                    borderWidth: 1.0,
                                    height: 20,
                                    styleBuilder: (val) => ToggleStyle(
                                      backgroundColor: Colors.white,
                                      borderColor: Colors.grey.shade400,
                                      indicatorColor: Colors.red,
                                    ),
                                    textBuilder: (val) => Text(
                                      val,
                                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.black),
                                    ),
                                    iconBuilder: (val) => val == 'Full Day'
                                        ? const Icon(Icons.access_time, size: 16, color: Colors.black)
                                        : const Icon(Icons.calendar_today, size: 16, color: Colors.black),
                                    onChanged: (val) async {
                                      setState(() {
                                        selectbike = val;
                                      });
                                      final response = await http.put(
                                        Uri.parse('${ApiConfig.baseUrl}vendor/upadatefulldaybike/${widget.vendorid}'),
                                        headers: {'Content-Type': 'application/json'},
                                        body: jsonEncode({'fulldaybike': val}),
                                      );
                                      if (response.statusCode == 200) {
                                        print("Full day bike mode updated successfully");
                                      } else {
                                        print("Failed to update full day bike mode: ${response.body}");
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // White Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Add content here if needed (e.g., additional charges)
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (bikeEnabled && !bikeFullDay && bikeMonthly) ...[
                      // Monthly Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addbikeMonthlysubscription(
                                    onEditSuccess: () {
                                      selecedIndex = 1; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Monthly Charges',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: monthlybikecharge.isNotEmpty
                                        ? Text(
                                      monthlybikecharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // White Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Add content here if needed (e.g., additional charges)
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (bikeEnabled && bikeFullDay && bikeMonthly) ...[
                      // Full-day Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addbikefullday(
                                    onEditSuccess: () {
                                      selecedIndex = 1; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Full-day Charges',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: fulldaybikecharge.isNotEmpty
                                        ? Text(
                                      fulldaybikecharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
                                  ),
                                  const SizedBox(height: 12),
                                  AnimatedToggleSwitch<String>.dual(
                                    current: selectbike,
                                    first: 'Full Day',
                                    second: '24 Hours',
                                    spacing: 25.0,
                                    borderWidth: 1.0,
                                    height: 20,
                                    styleBuilder: (val) => ToggleStyle(
                                      backgroundColor: Colors.white,
                                      borderColor: Colors.grey.shade400,
                                      indicatorColor: Colors.red,
                                    ),
                                    textBuilder: (val) => Text(
                                      val,
                                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.black),
                                    ),
                                    iconBuilder: (val) => val == 'Full Day'
                                        ? const Icon(Icons.access_time, size: 16, color: Colors.black)
                                        : const Icon(Icons.calendar_today, size: 16, color: Colors.black),
                                    onChanged: (val) async {
                                      setState(() {
                                        selectbike = val;
                                      });
                                      final response = await http.put(
                                        Uri.parse('${ApiConfig.baseUrl}vendor/upadatefulldaybike/${widget.vendorid}'),
                                        headers: {'Content-Type': 'application/json'},
                                        body: jsonEncode({'fulldaybike': val}),
                                      );
                                      if (response.statusCode == 200) {
                                        print("Full day bike mode updated successfully");
                                      } else {
                                        print("Failed to update full day bike mode: ${response.body}");
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Monthly Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addbikeMonthlysubscription(
                                    onEditSuccess: () {
                                      selecedIndex = 1; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Monthly Charges',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: monthlybikecharge.isNotEmpty
                                        ? Text(
                                      monthlybikecharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
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

              ],
            ),
          ),
          // Add more bike-specific widgets here
        ],
      ),
    );
  }

  Widget _buildOthersTabContent() {
    return SingleChildScrollView(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(5.0),
            child:  isLoading // Check if loading
                ? Center(
              child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Image.asset('assets/gifload.gif',),
              ),
            )
                :Column(
              children: [

                // _buildVehicleSwitch("Others", othersEnabled, "Others"),
                if (othersEnabled) _buildParkingOptions("Others", othersTemporary, othersFullDay, othersMonthly),
                if (othersEnabled && othersTemporary)
                  Row(
                    children: [
                      // First Container wrapped with Expanded to fit the screen width
                      Expanded(
                        child: GestureDetector(
                          onTap: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => addothersminimumcharge(
                                onEditSuccess: () {
                                  selecedIndex = 2; // This callback can be used if you want to perform actions on success
                                },
                                vendorid: widget.vendorid,
                              )),
                            );
                            // After returning, refresh the data
                            _refreshData();
                          },
                          child: Container(
                            height: 120, // Increased for the toggle switch
                            width: 170,
                            decoration: BoxDecoration(
                              color: ColorUtils.primarycolor(),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Minimum Charges",
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  minimumotherCharges.isNotEmpty ? minimumotherCharges[0].type : '',
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: Colors.white,
                                  child: minimumotherCharges.isNotEmpty
                                      ? Text(
                                    minimumotherCharges[0].amount,
                                    style:  GoogleFonts.poppins(
                                      color: Colors.black,
                                      fontSize: 16,
                                    ),
                                  )
                                      : GestureDetector(
                                    onTap: () async {
                                      await Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (context) => addothersminimumcharge(
                                          onEditSuccess: () {
                                            selecedIndex = 2; // This callback can be used if you want to perform actions on success
                                          },
                                          vendorid: widget.vendorid,
                                        )),
                                      );
                                      // After returning, refresh the data
                                      _refreshData();
                                    },
                                    child: const IconButton(
                                      icon: Icon(
                                        Icons.add_circle,
                                        color: Colors.black,
                                      ),
                                      onPressed:  null,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 2,),

                      // Second Container wrapped with Expanded to fit the screen width
                      Expanded(
                        child: GestureDetector(
                          onTap: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => addothersadditionalcharge(
                                onEditSuccess: () {
                                  selecedIndex = 2; // This callback can be used if you want to perform actions on success
                                },
                                vendorid: widget.vendorid,
                              )),
                            );
                            // After returning, refresh the data
                            _refreshData();
                          },
                          child: Container(
                            height: 120, // Increased for the toggle switch
                            width: 170,
                            decoration: BoxDecoration(
                              color: ColorUtils.primarycolor(), // Change color if selected
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Additional Charges", // You can change the title dynamically
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                // Display the type of charge at the top
                                Text(
                                  " ${additionalotherCharges.isNotEmpty ? additionalotherCharges[0].type : ''}", // Display type or '' if no data
                                  style:  GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),

                                // Display the amount below the type
                                // CircleAvatar with action button
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: Colors.white,
                                  child: additionalotherCharges.isNotEmpty
                                      ? Text(
                                    additionalotherCharges[0].amount, // Display the amount as text
                                    style: GoogleFonts.poppins(
                                      color: Colors.black,
                                      fontSize: 16, // Adjust font size as needed
                                    ),
                                  )
                                      : GestureDetector(
                                    onTap: () async {
                                      await Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (context) => addothersadditionalcharge(
                                          onEditSuccess: () {
                                            selecedIndex = 2; // This callback can be used if you want to perform actions on success
                                          },
                                          vendorid: widget.vendorid,
                                        )),
                                      );
                                      // After returning, refresh the data
                                      _refreshData();
                                    },
                                    child: const IconButton(
                                      icon: Icon(
                                        Icons.add_circle,
                                        color: Colors.black,
                                      ),
                                      onPressed: null,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 2,),
                Row(
                  children: [
                    if (othersEnabled && othersFullDay && !othersMonthly) ...[
                      // Full-Day Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addothersfullday(
                                    onEditSuccess: () {
                                      selecedIndex = 2; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Full-Day Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: fulldayothercharge.isNotEmpty
                                        ? Text(
                                      fulldayothercharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16, // Fixed to match bike/car
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
                                  ),
                                  const SizedBox(height: 12),
                                  AnimatedToggleSwitch<String>.dual(
                                    current: selectothers,
                                    first: 'Full Day',
                                    second: '24 Hours',
                                    spacing: 25.0,
                                    borderWidth: 1.0,
                                    height: 20,
                                    styleBuilder: (val) => ToggleStyle(
                                      backgroundColor: Colors.white,
                                      borderColor: Colors.grey.shade400,
                                      indicatorColor: Colors.red,
                                    ),
                                    textBuilder: (val) => Text(
                                      val,
                                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.black),
                                    ),
                                    iconBuilder: (val) => val == 'Full Day'
                                        ? const Icon(Icons.access_time, size: 16, color: Colors.black)
                                        : const Icon(Icons.calendar_today, size: 16, color: Colors.black),
                                    onChanged: (val) async {
                                      setState(() {
                                        selectothers = val;
                                      });
                                      final response = await http.put(
                                        Uri.parse('${ApiConfig.baseUrl}vendor/upadatefulldayothers/${widget.vendorid}'),
                                        headers: {'Content-Type': 'application/json'},
                                        body: jsonEncode({'fulldayothers': val}),
                                      );
                                      if (response.statusCode == 200) {
                                        print("Full day others mode updated successfully");
                                      } else {
                                        print("Failed to update full day others mode: ${response.body}");
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // White Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Add content here if needed (e.g., additional charges)
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (othersEnabled && !othersFullDay && othersMonthly) ...[
                      // Monthly Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addothersMonthlysubscription(
                                    onEditSuccess: () {
                                      selecedIndex = 2; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Monthly Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: monthlyothercharge.isNotEmpty
                                        ? Text(
                                      monthlyothercharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // White Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Add content here if needed (e.g., additional charges)
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (othersEnabled && othersFullDay && othersMonthly) ...[
                      // Full-Day Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 2.0, right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addothersfullday(
                                    onEditSuccess: () {
                                      selecedIndex = 2; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Full-Day Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: fulldayothercharge.isNotEmpty
                                        ? Text(
                                      fulldayothercharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16, // Fixed to match bike/car
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
                                  ),
                                  const SizedBox(height: 12),
                                  AnimatedToggleSwitch<String>.dual(
                                    current: selectothers,
                                    first: 'Full Day',
                                    second: '24 Hours',
                                    spacing: 25.0,
                                    borderWidth: 1.0,
                                    height: 20,
                                    styleBuilder: (val) => ToggleStyle(
                                      backgroundColor: Colors.white,
                                      borderColor: Colors.grey.shade400,
                                      indicatorColor: Colors.red,
                                    ),
                                    textBuilder: (val) => Text(
                                      val,
                                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.black),
                                    ),
                                    iconBuilder: (val) => val == 'Full Day'
                                        ? const Icon(Icons.access_time, size: 16, color: Colors.black)
                                        : const Icon(Icons.calendar_today, size: 16, color: Colors.black),
                                    onChanged: (val) async {
                                      setState(() {
                                        selectothers = val;
                                      });
                                      final response = await http.put(
                                        Uri.parse('${ApiConfig.baseUrl}vendor/upadatefulldayothers/${widget.vendorid}'),
                                        headers: {'Content-Type': 'application/json'},
                                        body: jsonEncode({'fulldayothers': val}),
                                      );
                                      if (response.statusCode == 200) {
                                        print("Full day others mode updated successfully");
                                      } else {
                                        print("Failed to update full day others mode: ${response.body}");
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Monthly Charges Container
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 2.0),
                          child: GestureDetector(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => addothersMonthlysubscription(
                                    onEditSuccess: () {
                                      selecedIndex = 2; // Fixed typo
                                    },
                                    vendorid: widget.vendorid,
                                  ),
                                ),
                              );
                              _refreshData();
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Monthly Charges",
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor: Colors.white,
                                    child: monthlyothercharge.isNotEmpty
                                        ? Text(
                                      monthlyothercharge[0].amount,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 16,
                                      ),
                                    )
                                        : const Icon(Icons.add_circle, color: Colors.black),
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

                const SizedBox(width: 2,),
                // Second Container wrapped with Expanded to fit the screen width

              ],
            ),
          ),
        ],
      ),
    );
  }


  Widget buildInfoCard() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchCategories(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader();
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['categories'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['totalCount'];
        List<Category> categories = snapshot.data!['categories'];

        return _buildContent("Total", totalCount, categories);
      },
    );
  }
  Widget _buildContent(String title, String totalCount, List<Category> categories) {
    return Container(
      height: 110,
      width: 110,
      decoration: BoxDecoration(
        color: ColorUtils.primarycolor(),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style:  GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          CircleAvatar(
            radius: 16,
            backgroundColor: Colors.white,
            child: Text(
              totalCount,
              style: GoogleFonts.poppins(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
          ),
          const SizedBox(height: 5),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: categories
                .map((category) => buildCategoryColumn(category.name, category.count))
                .toList(),
          ),
        ],
      ),
    );
  }
  Widget _buildkeletonLoader() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        height: 110,
        width: 110,
        decoration: BoxDecoration(
          color: Colors.grey[300],
          borderRadius: BorderRadius.circular(5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(height: 10, width: 50, color: Colors.grey[300]),
            const SizedBox(height: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.grey[300],
            ),
            const SizedBox(height: 5),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(
                3,
                    (index) => Container(height: 10, width: 30, color: Colors.grey[300]),
              ),
            ),
          ],
        ),
      ),
    );
  }
  Widget buildbookedslot() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchbookedslot(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['categories'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['totalCount'];
        List<Category> categories = snapshot.data!['categories'];

        return Container(
          height: 110, // Adjust height as needed
          width: 110,
          decoration: BoxDecoration(
            color: ColorUtils.primarycolor(),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Display total count at the top
              Text(
                "Parked",
                style:  GoogleFonts.poppins(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              CircleAvatar(
                radius: 16,
                backgroundColor: Colors.white,
                child: Text(
                  totalCount,
                  style:  GoogleFonts.poppins(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
              ),
              const SizedBox(height: 5), // Add some space between total count and categories
              // Display categories below the total count
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: categories
                    .map((category) => buildCategoryColumn(category.name, category.count))
                    .toList(),
              ),
            ],
          ),
        );
      },
    );
  }
  Widget buildavailableslot() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchavailableslote(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['categories'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['totalCount'];
        List<Category> categories = snapshot.data!['categories'];

        return Container(
          height: 110, // Adjust height as needed
          width: 110,
          decoration: BoxDecoration(
            color: ColorUtils.primarycolor(),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Display total count at the top
              Text(
                "Available ",
                style:  GoogleFonts.poppins(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              CircleAvatar(
                radius: 16,
                backgroundColor: Colors.white,
                child: Text(
                  totalCount,
                  style: GoogleFonts.poppins(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
              ),
              const SizedBox(height: 5), // Add some space between total count and categories
              // Display categories below the total count
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: categories
                    .map((category) => buildCategoryColumn(category.name, category.count))
                    .toList(),
              ),
            ],
          ),
        );
      },
    );
  }
  static String getDayOfWeek(int index) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    return days[index];
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
  Widget _statusLabel(String label, Color color, {bool isSmallScreen = false}) {
    return Container(
      padding:
      EdgeInsets.symmetric(vertical: 4, horizontal: isSmallScreen ? 4 : 8),
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
}

Widget buildCategoryColumn(String category, String count) {
  return Column(
    children: [
      Text(
        category,
        style:  GoogleFonts.poppins(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      CircleAvatar(
        radius: 16,
        backgroundColor: Colors.white,
        child: Text(
          count,
          style: GoogleFonts.poppins(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
      ),
    ],
  );
}

class Category {
  final String name;
  final String count;

  Category({required this.name, required this.count});

  factory Category.fromJson(String name, dynamic count) {
    return Category(
      name: name,
      count: count.toString(), // Convert count to a string
    );
  }
}

Future<Map<String, dynamic>> fetchCategories(String vendorId) async {
  try {
    final uri = Uri.parse('${ApiConfig.baseUrl}vendor/fetch-slot-vendor-data/$vendorId');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      if (data.isNotEmpty) {
        final List<Category> categories = [];
        data.forEach((key, value) {
          if (key != 'totalCount') {
            categories .add(Category.fromJson(key, value));
          }
        });
        return {
          'totalCount': data['totalCount'].toString(),
          'categories': categories,
        };
      } else {
        throw Exception('No categories found');
      }
    } else {
      throw Exception('Failed to load categories, status code: ${response.statusCode}');
    }
  } catch (e) {
    throw Exception('An error occurred while fetching categories: $e');
  }
}
Future<Map<String, dynamic>> fetchbookedslot(String vendorId) async {
  try {
    final uri = Uri.parse('${ApiConfig.baseUrl}vendor/bookedslots/$vendorId');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      if (data.isNotEmpty) {
        final List<Category> categories = [];
        data.forEach((key, value) {
          if (key != 'totalCount') {
            categories .add(Category.fromJson(key, value));
          }
        });
        return {
          'totalCount': data['totalCount'].toString(),
          'categories': categories,
        };
      } else {
        throw Exception('No categories found');
      }
    } else {
      throw Exception('Failed to load categories, status code: ${response.statusCode}');
    }
  } catch (e) {
    throw Exception('An error occurred while fetching categories: $e');
  }
}
Future<Map<String, dynamic>> fetchavailableslote(String vendorId) async {
  try {
    final uri = Uri.parse('${ApiConfig.baseUrl}vendor/availableslots/$vendorId');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      if (data.isNotEmpty) {
        final List<Category> categories = [];
        data.forEach((key, value) {
          if (key != 'totalCount') {
            categories .add(Category.fromJson(key, value));
          }
        });
        return {
          'totalCount': data['totalCount'].toString(),
          'categories': categories,
        };
      } else {
        throw Exception('No categories found');
      }
    } else {
      throw Exception('Failed to load categories, status code: ${response.statusCode}');
    }
  } catch (e) {
    throw Exception('An error occurred while fetching categories: $e');
  }
}

class ParkingCharge {
  final String amount;
  final String type;
  final String category;

  ParkingCharge({
    required this.amount,
    required this.type,
    required this.category,
  });

  factory ParkingCharge.fromJson(Map<String, dynamic> json) {
    return ParkingCharge(
      amount: json['amount'],
      type: json['type'],
      category: json['category'],
    );
  }
}

// Model for Services
class Services {
  final String type;
  final String amount;

  Services({required this.type, required this.amount});

  factory Services.fromJson(Map<String, dynamic> json) {
    return Services(
      type: json['text'], // Assuming 'text' is the type you want
      amount: json['amount'].toString(), // Ensure amount is a string
    );
  }
}

// Model for Amenity
class Amenity {
  final String name;
  final String description;

  Amenity({required this.name, required this.description});

  factory Amenity.fromJson(Map<String, dynamic> json) {
    return Amenity(
      name: json['name'],
      description: json['description'] ?? '', // Provide a default value if description is null
    );
  }
}

// Function to fetch amenities and parking services
Future<AmenitiesAndParking> fetchAmenitiesAndParking(String vendorId) async {
  final url = Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId');

  try {
    final response = await http.get(url);

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return AmenitiesAndParking.fromJson(data);
    } else {
      throw Exception('Failed to load data: ${response.statusCode}');
    }
  } catch (e) {
    print('Error: $e');
    throw Exception('Error fetching data: $e');
  }
}

// Model for combined amenities and parking services
class AmenitiesAndParking {
  final List<String> amenities; // Change to List<String>
  final List<Services> services;

  AmenitiesAndParking({required this.amenities, required this.services});

  factory AmenitiesAndParking.fromJson(Map<String, dynamic> json) {
    return AmenitiesAndParking(
      amenities: List<String>.from(
        json['AmenitiesData']['amenities'].map((item) => item.toString()), // Convert to List<String>
      ),
      services: List<Services>.from(
        json['AmenitiesData']['parkingEntries'].map((item) => Services.fromJson(item)),
      ),
    );
  }

}


class Vendors {
  final String id;
  final String name;
  final String address;
  final String image; // Add this line
  final String latitude;
  final String landmark;// Add this line
  final String longitude; // Add this line
  final List<Contact> contacts; // Assuming you have a Contact class

  Vendors({
    required this.id,
    required this.name,
    required this.address,
    required this.landmark,
    required this.image, // Add this line
    required this.latitude, // Add this line
    required this.longitude, // Add this line
    required this.contacts,
  });

  factory Vendors.fromJson(Map<String, dynamic> json) {
    return Vendors(
      id: json['id'] ?? '',
      name: json['name'] ?? 'No Name',
      address: json['address'] ?? 'NA',
      landmark: json['landmark'] ?? '',
      image: json['image'] ?? '',
      latitude: json['latitude'] ?? '0.0',
      longitude: json['longitude'] ?? '0.0',
      contacts: (json['contacts'] as List<dynamic>?)
          ?.map((item) => Contact.fromJson(item))
          .toList() ?? [],
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