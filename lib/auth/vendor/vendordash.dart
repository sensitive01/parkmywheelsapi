import 'dart:async';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lottie/lottie.dart';
import 'package:mywheels/auth/customer/parking/parkindetails.dart';
import 'package:mywheels/auth/vendor/paytimeamount.dart';
import 'package:flutter/material.dart';
import 'package:mywheels/auth/vendor/bookings.dart';
import 'package:mywheels/auth/vendor/qrcodeallowparking.dart';
import 'package:mywheels/auth/vendor/subscription/addsubscribe.dart';
import 'package:mywheels/auth/vendor/vendorbottomnav/flashbarvendor.dart';
import 'package:mywheels/auth/vendor/vendorbottomnav/thirdbottom.dart';
import 'package:mywheels/auth/vendor/vendorbottomnav/thirdpage.dart';
import 'package:mywheels/auth/vendor/vendorbottomnav/vendorprofile.dart';
import 'package:mywheels/auth/vendor/vendorcreatebooking.dart';
import 'package:mywheels/auth/vendor/vendornotificationpage.dart';
import 'package:mywheels/auth/vendor/vendorsearch.dart';
import 'package:mywheels/auth/vendor/vendorsubscriptionapply.dart';
import 'package:mywheels/config/authconfig.dart';
import 'package:mywheels/config/colorcode.dart';
import 'dart:convert'; // For json.decode
import 'package:http/http.dart' as http;
import 'package:mywheels/pageloader.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shimmer/shimmer.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:tab_container/tab_container.dart';

import '../../main.dart';
import '../customer/parking/bookparking.dart';
import 'menusscreen.dart';

class vendordashScreen extends StatefulWidget {
  final String vendorid;
  final int? initialTabIndex;
  const vendordashScreen({super.key,
    required this.vendorid,
    this.initialTabIndex,
    // required this.userName
  });

  @override
  State<vendordashScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<vendordashScreen> with SingleTickerProviderStateMixin {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  final TextEditingController _dateController = TextEditingController();

  String? _menuImageUrl;
  final PermissionStatus _locationPermissionStatus = PermissionStatus.denied;

  int _currentSegment = 0;
  Vendor? _vendor;
  late List<Widget> _pages;
  late TabController _tabController;


  void _onTabChange(int index) {
    _navigateToPage(index);
  }


  @override
  void initState() {
    super.initState();
    _requestNotificationPermission();
    _tabController = TabController(length: 3,
        initialIndex: widget.initialTabIndex ?? 0,
        vsync: this);
    _currentSegment = widget.initialTabIndex ?? 0;
    _tabController.addListener(() {
      setState(() {
        _currentSegment = _tabController.index; // Update current segment based on TabController index
      });
    });
    _fetchVendorData();
    _fetcVendorData();
    // fetchUserData(int.parse(widget.userId)); // Convert userId to int
    _pagess = [
      vendordashScreen(vendorid: widget.vendorid),
      Bookings(vendorid: widget.vendorid),
      qrcodeallowpark(vendorid: widget.vendorid),
      Third(vendorid: widget.vendorid),

      menu(vendorid: widget.vendorid),
    ];
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
        const SnackBar(content: Text('')),
        // const SnackBar(content: Text('Failed to load vendor data. Please try again later.')),
      );
    }
  }

  Future<void> _requestNotificationPermission() async {
    if (Platform.isAndroid) {
      // For Android 13 (API level 33) and above
      if (await DeviceInfoPlugin().androidInfo.then((info) => info.version.sdkInt) >= 33) {
        final status = await Permission.notification.status;

        if (status.isDenied) {
          // Request permission
          final result = await Permission.notification.request();

          if (result.isPermanentlyDenied) {
            // Show dialog to guide user to app settings
            _showPermissionSettingsDialog();
          }
        }
      }
      // For Android 12 and below, notifications are enabled by default
    } else if (Platform.isIOS) {
      // iOS-specific permission request
      final bool? result = await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
        alert: true,
        // badge: true,
        sound: true,
      );

      if (result != true) {
        _showPermissionSettingsDialog();
      }
    }
  }

  void _showPermissionSettingsDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Permission Required'),
          content: const Text(
            'Notifications are important for booking updates and alerts. '
                'Please enable them in app settings.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                openAppSettings(); // Open device settings
              },
              child: const Text('Open Settings'),
            ),
          ],
        );
      },
    );
  }
  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
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
            if (key != 'Cars') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Cars': data['Cars'].toString(),
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
            if (key != 'Cars') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Cars': data['Cars'].toString(),
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
            if (key != 'Cars') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Cars': data['Cars'].toString(),
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

  Future<Map<String, dynamic>> fetchbikeCategories(String vendorId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}vendor/fetch-slot-vendor-data/$vendorId');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final List<Category> categories = [];
          data.forEach((key, value) {
            if (key != 'Bikes') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Bikes': data['Bikes'].toString(),
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
  Future<Map<String, dynamic>> fetchbikebookedslot(String vendorId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}vendor/bookedslots/$vendorId');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final List<Category> categories = [];
          data.forEach((key, value) {
            if (key != 'Bikes') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Bikes': data['Bikes'].toString(),
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
  Future<Map<String, dynamic>> fetchbikeavailableslote(String vendorId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}vendor/availableslots/$vendorId');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final List<Category> categories = [];
          data.forEach((key, value) {
            if (key != 'Bikes') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Bikes': data['Bikes'].toString(),
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

  Future<Map<String, dynamic>> fetchothersCategories(String vendorId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}vendor/fetch-slot-vendor-data/$vendorId');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final List<Category> categories = [];
          data.forEach((key, value) {
            if (key != 'Others') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Others': data['Others'].toString(),
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
  Future<Map<String, dynamic>> fetchothersbookedslot(String vendorId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}vendor/bookedslots/$vendorId');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final List<Category> categories = [];
          data.forEach((key, value) {
            if (key != 'Others') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Others': data['Others'].toString(),
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
  Future<Map<String, dynamic>> fetchothersavailableslote(String vendorId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}vendor/availableslots/$vendorId');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final List<Category> categories = [];
          data.forEach((key, value) {
            if (key != 'Others') {
              categories .add(Category.fromJson(key, value));
            }
          });
          return {
            'Others': data['Others'].toString(),
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

  Future<String> fetchSubscriptionStatus(String vendorId) async {
    // Make HTTP request and get the subscription status
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}vendor/fetchsubscription/$vendorId'));

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = json.decode(response.body);
      final vendor = data['vendor'];
      return vendor['subscription']; // Return 'true' or 'false'
    } else {
      return 'false'; // Default to false if there's an error
    }
  }

  Future<void> _fetcVendorData() async {
    setState(() {
      _isLoading = true; // Set loading to true when starting to fetch data
    });
    await Future.delayed(const Duration(seconds: 2));
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

        if (data['data'] != null) {
          setState(() {
            _vendor = Vendor.fromJson(data['data']);
          });
        } else {
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception('Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      print('Error fetching vendor data: $error');

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('')),
        // const SnackBar(content: Text('Failed to load vendor data. Please try again later.')),
      );
    } finally {
      setState(() {
        _isLoading = false; // Set loading to false when done
      });
    }
  }
  bool _isLoading = true;
  final int _selectedIndex = 0;
  int _selecteddIndex = 0;
  late List<Widget> _pagess;

  void _navigateToPage(int index) {
    setState(() {
      _selecteddIndex = index;
    });
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => _pagess[index]),
    );
  }



  @override
  void dispose() {

    _tabController.dispose(); // Clean up the controller when not in use
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: Colors.white,


      body: _isLoading
          ? const  LoadingGif() // Show loading GIF before the Scaffold
          :SafeArea(
          child: _buildRamScreen()),

      bottomNavigationBar: BottomNavBar(
        selectedIndex: _selectedIndex,
        onTabChange: _onTabChange,
        menuImageUrl: _menuImageUrl,
      ),

    );


  }
  String getLimitedText(String text, int maxLength) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength); // Truncate the text to maxLength
    }
    return text;
  }
  Widget _buildRamScreen() {
    return Container(
      color: Colors.white,
      child: SingleChildScrollView(
        child: Column(

          crossAxisAlignment: CrossAxisAlignment.center,
          children: [

            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 7),
              child: Skeletonizer(
                enabled: _isLoading, // Activate skeleton loading if still loading
                child: _isLoading
                    ? _buildSkeletonLoader()
                    : Row(
                  children: [
                    // Location Icon
                    Icon(
                      Icons.location_on_rounded,
                      color: ColorUtils.primarycolor(),
                      size: 34,
                    ),
                    const SizedBox(width: 10), // Spacing

                    // Vendor Details (GestureDetector and Text wrapped inside a Column)
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => vendorProfilePage(vendorid: widget.vendorid),
                          ),
                        );
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                (_vendor?.vendorName ?? '').length > 15
                                    ? '${_vendor!.vendorName.substring(0, 20)}...'
                                    : _vendor?.vendorName ?? '',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),

                              const Icon(Icons.arrow_drop_down),
                            ],
                          ),
                          Text(
                            getLimitedText(_vendor?.address ?? '', 25), // Limit to 30 characters
                            style: GoogleFonts.poppins(fontSize: 12, color: Colors.black),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1, // Ensure single-line display
                          ),
                        ],
                      ),
                    ),

                    // Spacer to push the CircleAvatar to the far right
                    const Spacer(),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>  VendorNotificationScreen(vendorid: widget.vendorid),
                          ),
                        );
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: ColorUtils.primarycolor(),
                            width: 0.5,
                          ),
                        ),
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: ColorUtils.primarycolor(),
                          child: const Icon(Icons.notifications, size: 24, color: Colors.white), // Moved inside `child`
                        ),
                      ),
                    ),

                    // Circle Avatar for Menu Icon
                    // GestureDetector(
                    //   onTap: () {
                    //     Navigator.push(
                    //       context,
                    //       MaterialPageRoute(
                    //           builder: (context) =>
                    //               vendorProfilePage(vendorid: widget.vendorid)),
                    //     );
                    //   },
                    //   child: Container(
                    //     decoration: BoxDecoration(
                    //       shape: BoxShape.circle,
                    //       border: Border.all(
                    //         color: ColorUtils.primarycolor(),
                    //         width: 0.5,
                    //       ),
                    //     ),
                    //     child: CircleAvatar(
                    //       radius: 20,
                    //       backgroundColor: Colors.grey[300],
                    //       backgroundImage: (_vendor?.image.isNotEmpty ?? false)
                    //           ? NetworkImage(_vendor!.image)
                    //           : null,
                    //       child: (_vendor?.image.isEmpty ?? true)
                    //           ? Icon(Icons.person, size: 14, color: Colors.black54)
                    //           : null,
                    //     ),
                    //   ),
                    // ),
                  ],
                ),
              ),
            ),



            // Padding(
            //   padding: const EdgeInsets.only(left: 8.0), // Space between search and button
            //   child: Stack(
            //     alignment: Alignment.centerRight,
            //     children: [
            //       ElevatedButton(
            //         onPressed: () async {
            //           String subscriptionStatus = await fetchSubscriptionStatus(widget.vendorid);
            //
            //           if (subscriptionStatus == 'true') {
            //             Navigator.push(
            //               context,
            //               MaterialPageRoute(
            //                 builder: (context) => vendorChooseParkingPage(vendorid: widget.vendorid),
            //               ),
            //             );
            //           } else {
            //             Navigator.push(
            //               context,
            //               MaterialPageRoute(
            //                 builder: (context) => ChoosePlan(vendorid: widget.vendorid),
            //               ),
            //             );
            //           }
            //         },
            //         style: ElevatedButton.styleFrom(
            //           backgroundColor: ColorUtils.primarycolor(),
            //           foregroundColor: Colors.white,
            //           shape: RoundedRectangleBorder(
            //             borderRadius: BorderRadius.circular(5),
            //             side: BorderSide(color: Colors.black, width: 0.5), // Black border with 0.5px width
            //           ),
            //           padding: EdgeInsets.symmetric(vertical: 5.0, horizontal: 10.0), // Add top padding for text
            //           minimumSize: Size(0, 15),
            //         ),
            //         child: Column(
            //           mainAxisAlignment: MainAxisAlignment.start, // Aligns text at the top of the button
            //           children: [
            //             Text(
            //               'New Booking',
            //               style: GoogleFonts.poppins(
            //                 fontSize: 12,
            //                 fontWeight: FontWeight.bold,
            //                 color: Colors.white, // Correctly setting the text color
            //               ),
            //             ),
            //           ],
            //         ),
            //       ),
            //       Positioned(
            //         right: 0, // Adjust this value to control how much of the image is outside
            //         top: -5,
            //
            //         child: Container(
            //           width: 35, // Controls the visible part of the image
            //           height: 35, // Optional: Adjust size of the image as needed
            //           child: Image.asset('assets/subscribe.png'),
            //         ),
            //       ),
            //     ],
            //   ),
            // ),
            const SizedBox(height: 15,),


            Padding(
              padding: const EdgeInsets.only(left: 7.0,right: 7.0),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => vSearchScreen(vendorid: widget.vendorid)),
                        );
                      },
                      child: TextFormField(
                        readOnly: true,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => vSearchScreen(vendorid: widget.vendorid)),
                          );
                        },
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: const Color(0xFFF1F2F3),
                          border: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: ColorUtils.secondarycolor(),
                              width: 0.5,
                            ),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(5),
                            borderSide: BorderSide(
                              color: ColorUtils.secondarycolor(),
                              width: 0.5,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(5),
                            borderSide: BorderSide(
                              color: ColorUtils.secondarycolor(),
                              width: 0.5,
                            ),
                          ),
                          prefixIcon: GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => vSearchScreen(vendorid: widget.vendorid)),
                              );
                            },
                            child: Icon(
                              Icons.search,
                              color: ColorUtils.primarycolor(),
                            ),
                          ),
                          constraints: const BoxConstraints(
                            maxHeight: 36,  // Reduced height
                            maxWidth: double.infinity,
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12), // Reduced padding
                          hintText: 'Search ',
                          hintStyle: GoogleFonts.poppins(
                            fontWeight: FontWeight.w300,
                            fontSize: 14,
                            color: Colors.black,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 5.0), // Space between search and button
                    child: Stack(
                      clipBehavior: Clip.none, // Allows overflow
                      alignment: Alignment.centerRight,
                      children: [
                        ElevatedButton(
                          onPressed: () async {
                            String subscriptionStatus = await fetchSubscriptionStatus(widget.vendorid);

                            if (subscriptionStatus == 'true') {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => vendorChooseParkingPage(vendorid: widget.vendorid),
                                ),
                              );
                            } else {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChoosePlan(vendorid: widget.vendorid),
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorUtils.primarycolor(),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                              side: const BorderSide(color: Color(0xFFE4AC3F), width: 1.5),

                              // Black border with 0.5px width
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 4.0, horizontal: 10.0), // Reduced vertical padding
                            minimumSize: const Size(0, 36),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Image.asset('assets/addicon.png',height: 20,),
                              const SizedBox(width: 5.0), // Space between icon and text
                              Text(
                                'New Booking',
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white, // Correctly setting the text color
                                ),
                              ),
                            ],
                          ),
                        ),
                        Positioned(
                          top: -18, // Move the image upwards to position it in the top half
                          right: 10, // Adjust this value to control how much of the image is outside
                          child: SizedBox(
                            width: 80, // Controls the visible part of the image
                            height: 35, // Adjust size of the image as needed
                            child: Image.asset('assets/subscribe.png'),
                          ),
                        ),
                      ],
                    ),
                  ),



                ],
              ),
            ),




            // SizedBox(height: 15,),
            //
            //
            //
            // SizedBox(height: 15,),

            const SizedBox(height: 10,),

            Padding(
              padding: const EdgeInsets.all(6.0),
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F2F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(10), // Rounded corners only at the top
                    topRight: Radius.circular(10),
                  ), // Adjust radius for the circular effect
                  // border: Border.all(
                  //     color: ColorUtils.primarycolor(), // Red border color
                  // // Border color
                  //     width: 0.5, //full border
                  //
                  // ),
                ),
                child: Column(
                  children: [

                    Container(
                      height: 39,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(10), // Rounded corner at the top-left
                          topRight: Radius.circular(10), // Rounded corner at the top-right
                        ), // Set the circular border radius to 1
                        // border: Border.all(
                        //   color: ColorUtils.primarycolor(), // Set the border color (or any other color you prefer)
                        //   width: 0, // Set the border width
                        // ),
                      ),
                      child: TabBar(
                        dividerHeight: 0,
                        controller: _tabController,
                        indicator: RoundedRectIndicator(
                          color: const Color(0xFFF1F2F3),
                          radius: 8,
                        ),
                        tabs: [
                          Tab(child: CustomTab(text: "Cars", isSelected: _tabController.index == 0)),
                          Tab(child: CustomTab(text: "Bikes", isSelected: _tabController.index == 1)),
                          Tab(child: CustomTab(text: "Others", isSelected: _tabController.index == 2)),
                        ],

                      ),

                    ),
                    const SizedBox(height: 10,),
                    Padding(
                      padding: const EdgeInsets.all(1.0),
                      child: Builder(
                        builder: (context) {
                          if (_currentSegment == 0) {
                            // Display data for Cars
                            return Row(
                              // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                buildcartotal(),
                                const SizedBox(width: 5,),
                                buildcarparked(),
                                const SizedBox(width: 5,),
                                buildavailableparked(),
                              ],
                            );
                          } else if (_currentSegment == 1) {
                            // Display data for Bikes
                            return Row(
                              // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                buildbiketotal(),
                                const SizedBox(width: 5,),
                                buildbikeparked(),
                                const SizedBox(width: 5,),
                                buildbikeavailableparked(),
                              ],
                            );
                          } else if (_currentSegment == 2) {
                            // Display data for Others
                            return Row(
                              // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                buildotherstotal(),
                                const SizedBox(width: 5,),
                                buildothersparked(),
                                const SizedBox(width: 5,),
                                buildothersavailableparked(),
                              ],
                            );
                          } else {
                            // Fallback to an empty container for invalid segments
                            return Container();
                          }
                        },
                      ),
                    ),


                    const SizedBox(height: 10,),

                    const SizedBox(height: 10,),
                    Container(color: const Color(0xFFF1F2F3),
                      child: SizedBox(
                        height: 600,
                        // height: MediaQuery.of(context).size.height -
                        //     MediaQuery.of(context).padding.top - // Status bar height
                        //     kToolbarHeight, // AppBar height (if any)
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            CarsTab( vendorid: widget.vendorid,tab:"0"),
                            BikesTab( vendorid: widget.vendorid,tab:"1"),
                            OthersTab( vendorid: widget.vendorid,tab:"2"),
                          ],
                        ),
                      ),
                    ),

                  ],
                ),
              ),
            ),


          ],
        ),
      ),
    );
  }




  Widget _buildContent(String title, String totalCount, List<Category> categories) {
    return Expanded(
      child: Container(
        height: 110,
        // width: 115,
        decoration: BoxDecoration(
          color: ColorUtils.primarycolor(),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              title,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 5),
            CircleAvatar(
              radius: 26,
              backgroundColor: Colors.white,
              child: Text(
                totalCount,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
            ),
            const SizedBox(height: 5),

          ],
        ),
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
  Widget _buildSkeletonLoader() {
    return SafeArea(
      child: Row(
        children: [
          // Skeleton for location icon
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(17),
            ),
          ),
          const SizedBox(width: 10),

          // Skeleton for text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 16,
                  width: 100,
                  color: Colors.grey[300],
                ),
                const SizedBox(height: 8),
                Container(
                  height: 14,
                  width: 150,
                  color: Colors.grey[300],
                ),
              ],
            ),
          ),

          // Skeleton for avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  Widget buildcartotal() {
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

        String totalCount = snapshot.data!['Cars'];
        List<Category> categories = snapshot.data!['categories'];

        return _buildContent("Total", totalCount, categories);
      },
    );
  }
  Widget buildcarparked() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchbookedslot(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Cars'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Cars'];


        return Expanded(
          child: Container(
            height: 110, // Adjust height as needed
            // width: 110,
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
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Text(
                    totalCount,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 5), // Add some space between total count and categories

              ],
            ),
          ),
        );
      },
    );
  }
  Widget buildavailableparked() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchavailableslote(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Cars'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Cars'];


        return Expanded(
          child: Container(
            height: 110, // Adjust height as needed
            // width: 110,
            decoration: BoxDecoration(
              color: ColorUtils.primarycolor(),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Display total count at the top
                Text(
                  "Available",
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Text(
                    totalCount,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 5), // Add some space between total count and categories
                // Display categories below the total count
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceAround,
                //   children: categories
                //       .map((category) => buildCategoryColumn(category.name, category.count))
                //       .toList(),
                // ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildbiketotal() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchbikeCategories(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader();
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Bikes'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Bikes'];
        List<Category> categories = snapshot.data!['categories'];

        return _buildContent("Total", totalCount, categories);
      },
    );
  }
  Widget buildbikeparked() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchbikebookedslot(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Bikes'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Bikes'];


        return Expanded(
          child: Container(
            height: 110, // Adjust height as needed
            // width: 110,
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
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Text(
                    totalCount,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 5), // Add some space between total count and categories
                // Display categories below the total count
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceAround,
                //   children: categories
                //       .map((category) => buildCategoryColumn(category.name, category.count))
                //       .toList(),
                // ),
              ],
            ),
          ),
        );
      },
    );
  }
  Widget buildbikeavailableparked() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchbikeavailableslote(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Bikes'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Bikes'];


        return Expanded(
          child: Container(
            height: 110, // Adjust height as needed
            // width: 110,
            decoration: BoxDecoration(
              color: ColorUtils.primarycolor(),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Display total count at the top
                Text(
                  "Available",
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Text(
                    totalCount,
                    style:GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 5), // Add some space between total count and categories
                // Display categories below the total count
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceAround,
                //   children: categories
                //       .map((category) => buildCategoryColumn(category.name, category.count))
                //       .toList(),
                // ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildotherstotal() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchothersCategories(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader();
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['categories'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Others'];
        List<Category> categories = snapshot.data!['categories'];

        return _buildContent("Total", totalCount, categories);
      },
    );
  }
  Widget buildothersparked() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchothersbookedslot(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Others'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Others'];


        return Expanded(
          child: Container(
            height: 110, // Adjust height as needed
            // width: 110,
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
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Text(
                    totalCount,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 5), // Add some space between total count and categories
                // Display categories below the total count
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceAround,
                //   children: categories
                //       .map((category) => buildCategoryColumn(category.name, category.count))
                //       .toList(),
                // ),
              ],
            ),
          ),
        );
      },
    );
  }
  Widget buildothersavailableparked() {
    return FutureBuilder<Map<String, dynamic>>(
      future: fetchothersavailableslote(widget.vendorid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildkeletonLoader(); // Show skeleton loader
        } else if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        } else if (!snapshot.hasData || snapshot.data!['Others'].isEmpty) {
          return const Text('No data available');
        }

        String totalCount = snapshot.data!['Others'];


        return Expanded(
          child: Container(
            height: 110, // Adjust height as needed
            // width: 110,
            decoration: BoxDecoration(
              color: ColorUtils.primarycolor(),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Display total count at the top
                Text(
                  "Available",
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Text(
                    totalCount,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 5), // Add some space between total count and categories
                // Display categories below the total count
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceAround,
                //   children: categories
                //       .map((category) => buildCategoryColumn(category.name, category.count))
                //       .toList(),
                // ),
              ],
            ),
          ),
        );
      },
    );
  }

}
// Cars Stateful Widget
class CarsTab extends StatefulWidget {

  final String vendorid;
  final String tab;
  const CarsTab({super.key,  required this.vendorid,required this.tab});
  @override
  _CarsTabState createState() => _CarsTabState();
}

class _CarsTabState extends State<CarsTab> with SingleTickerProviderStateMixin {
  late final TabController _controller;
  int selectedTabIndex = 0;
  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time
  late final Timer _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);
  bool isLoading = true;
  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();
    _controller = TabController(vsync: this, length: 2);

    // Update tab change listener
    _controller.addListener(() {
      setState(() {
        selectedTabIndex = _controller.index;
      });

      if (selectedTabIndex == 0) {
        fetchBookingData().then((data) {
          setState(() {
            bookingDataNotifier.value = data;
            isLoading = false;  // Set loading flag to false after data is fetched
          });
          updatePayableTimes();
        }).catchError((error) {
          setState(() {
            isLoading = false;
          });
          print('Error fetching booking data: $error');
        });
      }
      // You can handle the other tab (index 1) as needed
    });

    _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      updatePayableTimes();
    });

    // Fetch the initial data
    fetchBookingData().then((data) {
      setState(() {
        bookingDataNotifier.value = data;
        isLoading = false;  // Set loading flag to false after initial data load
      });
      updatePayableTimes();
    }).catchError((error) {
      setState(() {
        isLoading = false;
      });
      print('Error fetching booking data: $error');
    });
  }

  String formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0'); // Ensure two digits
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0'); // Ensure two digits
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0'); // Ensure two digits

    return '$hours.$minutes.$seconds'; // Format as HH.MM.SS
  }
  void updatePayableTimes() {
    final now = DateTime.now();
    final updatedData = bookingDataNotifier.value.map((booking) {
      if (booking.status == 'PARKED' || booking.status == 'Booked') {
        final parkingTime = parseParkingDateTime(
          "${booking.parkeddate} ${booking.parkedtime}",
        );
        final elapsed = now.difference(parkingTime);

        // Debugging: Print elapsed time
        // print('Elapsed Time for ${booking.vehicleNumber}: $elapsed');

        // Ensure we update the payableDuration with correct values
        booking.payableDuration = elapsed;
      }
      return booking;
    }).toList();
    // Navigator.pop(context);
    // Trigger a rebuild of the widget with the updated data
    bookingDataNotifier.value = updatedData;
  }

  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
    final response = await http.get(url);

    // print('Resonse body: ${response.body}'); // Print the response for debugging

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonResponse = json.decode(response.body);

      // Extract the list from the "bookings" key
      final List<dynamic>? data = jsonResponse['bookings'];

      // Check if data is null or empty
      if (data == null || data.isEmpty) {
        throw 'No bookings available'; // Plain message for empty data
      }

      // Map the data to your Bookingdata model
      return data.map((item) => Bookingdata.fromJson(item)).toList();
    } else if (response.statusCode == 404 || response.statusCode == 400) {
      // Handle 404 or 400 with a clean message
      throw 'No booking found'; // Plain message for these errors
    } else {
      // Handle other status codes with a clear response
      throw response.body; // No "Error:" prefix here, just the API response
    }


  }
  DateTime parseParkingDateTime(String dateTimeString) {
    // Example input: "06-12-2024 11:04 AM"
    final parts = dateTimeString.split(' ');
    final dateParts = parts[0].split('-');
    final timeParts = parts[1].split(':'); // Change from '.' to ':'

    int day = int.parse(dateParts[0]);
    int month = int.parse(dateParts[1]);
    int year = int.parse(dateParts[2]);

    int hour = int.parse(timeParts[0]);
    int minute = int.parse(timeParts[1]);

    // Handle AM/PM
    if (parts[2] == 'PM' && hour != 12) {
      hour += 12; // Convert to 24-hour format
    } else if (parts[2] == 'AM' && hour == 12) {
      hour = 0; // Midnight case
    }

    return DateTime(year, month, day, hour, minute);
  }
  Duration getTotalParkedTime(String parkingDateTimeString) {
    DateTime parkingDateTime = parseParkingDateTime(parkingDateTimeString);
    DateTime now = DateTime.now(); // You can replace this with server time if available

    Duration difference = now.difference(parkingDateTime);

    if (difference.isNegative) {
      return Duration.zero; // Return zero duration if the parking time has not started yet
    }

    return difference; // Return the duration
  }
  @override
  void dispose() {
    // _timer.cancel();
    bookingDataNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final int currentSegment = _HomeScreenState()._currentSegment;
    return Container(

      decoration: BoxDecoration(
        // color: ColorUtils.primarycolor(),
        borderRadius: BorderRadius.circular(10),  // Circular border
        // border: Border.all(
        //   color: ColorUtils.primarycolor(),  // Border color, change as needed
        //   width: 0,           // Border width, adjust as needed
        // ),
      ),
      child: TabContainer(
        controller: _controller,  // Ensure the controller is passed here
        borderRadius: BorderRadius.circular(10),  // Ensure this is passed as well
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
        colors: const <Color>[Color(0xFFFFFFFF), Color(0xFFFFFFFF)],
        selectedTextStyle:GoogleFonts.poppins(
          fontSize: 15.0,
          color: ColorUtils.primarycolor(),
        ),
        unselectedTextStyle:GoogleFonts.poppins(
          fontSize: 13.0,
          color: Colors.black, // Set default unselected color
        ),
        tabs: _getTabs(),
        children: [
          // Provide content for the "On Parking" tab
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: ValueListenableBuilder<List<Bookingdata>>(
                valueListenable: bookingDataNotifier,
                builder: (context, bookingData, child) {
                  if (bookingData.isEmpty) {
                    // Show CircularProgressIndicator only if the data is still loading
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Car Parked'),
                      ],
                    );
                  }

                  // Filter the data
                  final filteredData = bookingData.where((booking) {
                    try {

                      return
                        booking.Vendorid == widget.vendorid &&
                            (booking.sts == "Instant" || booking.sts == "Schedule") &&
                            (booking.status == 'Booked' || booking.status == 'PARKED'|| booking.status == 'Parked') &&
                            booking.vehicletype == 'Car';
                    } catch (e) {
                      return false; // Skip invalid entries
                    }
                  }).toList();

                  if (filteredData.isEmpty) {
                    // Show "No data available" if filtering results in an empty list
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Car Parked'),
                      ],
                    );
                  }

                  // Show the filtered data in a ListView
                  return RefreshIndicator(
                    onRefresh: () async {
                      // Call the method to fetch data again
                      await fetchBookingData();
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];

                          return cardashleft(currentTabIndex: 0,vehicle: vehicle);

                        },
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: FutureBuilder<List<Bookingdata>>(
                future: fetchBookingData(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return Column(

                      children: [
                        const SizedBox(height: 50,),
                        Center(child: Lottie.asset(
                          'assets/carload.json', // Path to your Lottie JSON file
                          width: double.infinity, // Adjust the size
                          height: 200,
                          fit: BoxFit.contain,
                        ),),
                      ],
                    );
                  } else if (snapshot.hasError) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Car Parked'),
                      ],
                    );
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Car Parked'),
                      ],
                    );
                  } else {

                    final filteredData = snapshot.data!.where((booking) {
                      // Check if exitvehicledate exists
                      if (booking.exitvehicledate == null || booking.exitvehicledate!.isEmpty) return false;

                      // Parse exitvehicledate safely (assuming format: dd-mm-yyyy)
                      final parts = booking.exitvehicledate!.split('-');
                      if (parts.length != 3) return false;

                      final exitDay = int.tryParse(parts[0]);
                      final exitMonth = int.tryParse(parts[1]);
                      final exitYear = int.tryParse(parts[2]);
                      if (exitDay == null || exitMonth == null || exitYear == null) return false;

                      final exitDate = DateTime(exitYear, exitMonth, exitDay);
                      final now = DateTime.now();
                      final today = DateTime(now.year, now.month, now.day);

                      final bool isMatchingVendor = booking.Vendorid == widget.vendorid;
                      final bool isVehicleCar = booking.vehicletype == 'Car';
                      final bool isCompleted = booking.status.toUpperCase() == 'COMPLETED';
                      final bool isSameDay =
                          exitDate.year == today.year &&
                              exitDate.month == today.month &&
                              exitDate.day == today.day;

                      final bool isBookingTypeValid =
                          booking.sts == "Instant" || booking.sts == "Schedule";

                      // Filter condition
                      return isMatchingVendor && isVehicleCar && isCompleted && isSameDay && isBookingTypeValid;
                    }).toList();

                    print('Filtered Data Count: ${filteredData.length}');

// Debugging: print final filtered data
                    print('Filtered Data: $filteredData');


                    // If no filtered data, show message
                    if (filteredData.isEmpty) {
                      return const Column(
                        children: [
                          SizedBox(height: 150),
                          Text('No Car Parked'),
                        ],
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];
                          return vendordashright(vehicle: vehicle);
                        },
                      ),
                    );
                  }
                },
              ),
            ),
          ),


        ],
      ),
    );
  }

  List<Widget> _getTabs() {
    return [
      // Customer Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [

          const SizedBox(width: 8),
          Text(
            'On Parking',
            style:GoogleFonts.poppins(
              color: selectedTabIndex == 0 ? Colors.black : Colors.black,
            ),
          ),
        ],
      ),
      // Vendor Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon(
          //   Icons.verified_outlined,
          //   color: selectedTabIndex == 1 ? Colors.black : Colors.black,
          // ),
          const SizedBox(width: 8),
          Text(
            'Completed',
            style: GoogleFonts.poppins(
              color: selectedTabIndex == 1 ? Colors.black : Colors.black,
            ),
          ),
        ],
      ),
    ];
  }

}

class BikesTab extends StatefulWidget {
final String tab;
  final String vendorid;
  const BikesTab({super.key,  required this.vendorid,required this.tab});
  @override
  _BikesTabState createState() => _BikesTabState();
}

class _BikesTabState extends State<BikesTab> with SingleTickerProviderStateMixin {
  late final TabController _controller;
  int selectedTabIndex = 0;
  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time
  late final Timer _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);

  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();
    _controller = TabController(vsync: this, length: 2);
    _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      updatePayableTimes();
    });

    _controller.addListener(() {
      setState(() {
        selectedTabIndex = _controller.index;
        print('Selected Tab Index: $selectedTabIndex');
      });
    });
    fetchBookingData().then((data) {
      setState(() {
        bookingDataNotifier.value = data;
      });
      updatePayableTimes(); // Call update once data is fetched
    });
    fetchBookingData(); // Initial fetch
  }
  void updatePayableTimes() {
    final now = DateTime.now();
    final updatedData = bookingDataNotifier.value.map((booking) {
      if (booking.status == 'PARKED' || booking.status == 'Booked') {
        final parkingTime = parseParkingDateTime(
          "${booking.parkeddate} ${booking.parkedtime}",
        );
        final elapsed = now.difference(parkingTime);

        // Debugging: Print elapsed time
        // print('Elapsed Time for ${booking.vehicleNumber}: $elapsed');

        // Ensure we update the payableDuration with correct values
        booking.payableDuration = elapsed;
      }
      return booking;
    }).toList();

    // Trigger a rebuild of the widget with the updated data
    bookingDataNotifier.value = updatedData;
  }

  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
    final response = await http.get(url);

    // print('Resonse body: ${response.body}'); // Print the response for debugging

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonResponse = json.decode(response.body);

      // Extract the list from the "bookings" key
      final List<dynamic>? data = jsonResponse['bookings'];

      // Check if data is null or empty
      if (data == null || data.isEmpty) {
        throw 'No bookings available'; // Plain message for empty data
      }

      // Map the data to your Bookingdata model
      return data.map((item) => Bookingdata.fromJson(item)).toList();
    } else if (response.statusCode == 404 || response.statusCode == 400) {
      // Handle 404 or 400 with a clean message
      throw 'No bookings found'; // Plain message for these errors
    } else {
      // Handle other status codes with a clear response
      throw response.body; // No "Error:" prefix here, just the API response
    }


  }
  DateTime parseParkingDateTime(String dateTimeString) {
    // Example input: "06-12-2024 11:04 AM"
    final parts = dateTimeString.split(' ');
    final dateParts = parts[0].split('-');
    final timeParts = parts[1].split(':'); // Change from '.' to ':'

    int day = int.parse(dateParts[0]);
    int month = int.parse(dateParts[1]);
    int year = int.parse(dateParts[2]);

    int hour = int.parse(timeParts[0]);
    int minute = int.parse(timeParts[1]);

    // Handle AM/PM
    if (parts[2] == 'PM' && hour != 12) {
      hour += 12; // Convert to 24-hour format
    } else if (parts[2] == 'AM' && hour == 12) {
      hour = 0; // Midnight case
    }

    return DateTime(year, month, day, hour, minute);
  }
  Duration getTotalParkedTime(String parkingDateTimeString) {
    DateTime parkingDateTime = parseParkingDateTime(parkingDateTimeString);
    DateTime now = DateTime.now(); // You can replace this with server time if available

    Duration difference = now.difference(parkingDateTime);

    if (difference.isNegative) {
      return Duration.zero; // Return zero duration if the parking time has not started yet
    }

    return difference; // Return the duration
  }
  @override
  void dispose() {
    // _timer.cancel();
    bookingDataNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final int currentSegment = _HomeScreenState()._currentSegment;
    return Container(

      decoration: BoxDecoration(
        // color: ColorUtils.primarycolor(),
        borderRadius: BorderRadius.circular(10),  // Circular border
        // border: Border.all(
        //   color: ColorUtils.primarycolor(),  // Border color, change as needed
        //   width: 0,           // Border width, adjust as needed
        // ),
      ),
      child: TabContainer(
        controller: _controller,  // Ensure the controller is passed here
        borderRadius: BorderRadius.circular(10),  // Ensure this is passed as well
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
        colors: const <Color>[Color(0xFFFFFFFF), Color(0xFFFFFFFF)],
        selectedTextStyle: GoogleFonts.poppins(
          fontSize: 15.0,
          color: ColorUtils.primarycolor(),
        ),
        unselectedTextStyle: GoogleFonts.poppins(
          fontSize: 13.0,
          color: Colors.black, // Set default unselected color
        ),
        tabs: _getTabs(),
        children: [
          // Provide content for the "On Parking" tab
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: ValueListenableBuilder<List<Bookingdata>>(
                valueListenable: bookingDataNotifier,
                builder: (context, bookingData, child) {
                  if (bookingData.isEmpty) {
                    // Show CircularProgressIndicator only if the data is still loading
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Bike Parked'),
                      ],
                    );

                  }

                  // Filter the data
                  final filteredData = bookingData.where((booking) {
                    try {
                      // Parse the bookingDate string manually
                      List<String> parts = booking.bookingDate.split('-');
                      if (parts.length != 3) return false;




                      return
                        booking.Vendorid == widget.vendorid &&
                            (booking.sts == "Instant" || booking.sts == "Schedule") &&
                            (booking.status == 'Booked' || booking.status == 'PARKED'|| booking.status == 'Parked') &&
                            booking.vehicletype == 'Bike';
                    } catch (e) {
                      return false; // Skip invalid entries
                    }
                  }).toList();

                  if (filteredData.isEmpty) {
                    // Show "No data available" if filtering results in an empty list
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Bike Parked'),
                      ],
                    );
                  }

                  // Show the filtered data in a ListView
                  return RefreshIndicator(
                    onRefresh: () async {
                      // Call the method to fetch data again
                      await fetchBookingData();
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];

                          return bikedashleft(currentTabIndex: 1,vehicle: vehicle);

                        },
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: FutureBuilder<List<Bookingdata>>(
                future: fetchBookingData(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return Column(

                      children: [
                        const SizedBox(height: 50,),
                        Center(child: Lottie.asset(
                          'assets/bikeload.json', // Path to your Lottie JSON file
                          width: double.infinity, // Adjust the size
                          height: 200,
                          fit: BoxFit.contain,
                        ),),
                      ],
                    );
                  } else if (snapshot.hasError) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Bike Parked'),
                      ],
                    );
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No Bike Parked'),
                      ],
                    );
                  } else {

                    final filteredData = snapshot.data!.where((booking) {
                      // Ensure exitvehicledate is not null or empty
                      if (booking.exitvehicledate == null || booking.exitvehicledate!.isEmpty) return false;

                      // Parse the exit date safely (assuming format: dd-mm-yyyy)
                      final parts = booking.exitvehicledate!.split('-');
                      if (parts.length != 3) return false;

                      final exitDay = int.tryParse(parts[0]);
                      final exitMonth = int.tryParse(parts[1]);
                      final exitYear = int.tryParse(parts[2]);
                      if (exitDay == null || exitMonth == null || exitYear == null) return false;

                      final exitDate = DateTime(exitYear, exitMonth, exitDay);

                      // Vendor match
                      bool isMatchingVendor = booking.Vendorid == widget.vendorid;
                      print('Booking Vendor ID: ${booking.Vendorid}, Widget Vendor ID: ${widget.vendorid}, Match: $isMatchingVendor');

                      // Vehicle type match (Bike)
                      bool isVehicleBike = booking.vehicletype == 'Bike';
                      print('Booking Vehicle Type: ${booking.vehicletype}, Is Bike: $isVehicleBike');

                      // Completed status check
                      bool isCompleted = booking.status.toUpperCase() == 'COMPLETED';
                      print('Booking Status: ${booking.status}, Is Completed: $isCompleted');

                      // Compare only date (ignore time)
                      final now = DateTime.now();
                      final today = DateTime(now.year, now.month, now.day);
                      bool isSameDay = exitDate.year == today.year &&
                          exitDate.month == today.month &&
                          exitDate.day == today.day;

                      // Final filter condition
                      return isMatchingVendor && isVehicleBike && isCompleted && isSameDay;
                    }).toList();

                    print('Filtered Bike Data Count: ${filteredData.length}');

                    print('Filtered Data: $filteredData');


                    // If no filtered data, show message
                    if (filteredData.isEmpty) {
                      return const Column(
                        children: [
                          SizedBox(height: 150),
                          Text('No Bike Parked'),
                        ],
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];
                          return vendordashright(vehicle: vehicle);
                        },
                      ),
                    );
                  }
                },
              ),
            ),
          ),


        ],
      ),
    );
  }

  List<Widget> _getTabs() {
    return [
      // Customer Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon(
          //   Icons.local_parking,
          //   color: selectedTabIndex == 0 ? Colors.black : Colors.black,
          // ),
          const SizedBox(width: 8),
          Text(
            'On Parking',
            style: GoogleFonts.poppins(
              color: selectedTabIndex == 0 ? Colors.black : Colors.black,
            ),
          ),
        ],
      ),
      // Vendor Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon(
          //   Icons.verified_outlined,
          //   color: selectedTabIndex == 1 ? Colors.black : Colors.black,
          // ),
          const SizedBox(width: 8),
          Text(
            'Completed',
            style: GoogleFonts.poppins(
              color: selectedTabIndex == 1 ? Colors.black : Colors.black,
            ),
          ),
        ],
      ),
    ];
  }
  String formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0'); // Ensure two digits
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0'); // Ensure two digits
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0'); // Ensure two digits

    return '$hours.$minutes.$seconds'; // Format as HH.MM.SS
  }
}



class OthersTab extends StatefulWidget {

  final String vendorid;
  final String tab;
  const OthersTab({super.key,  required this.vendorid,required this.tab});
  @override
  _OthersTabState createState() => _OthersTabState();
}

class _OthersTabState extends State<OthersTab> with SingleTickerProviderStateMixin {
  late final TabController _controller;
  int selectedTabIndex = 0;
  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time
  late final Timer _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);
  bool isLoading = true;
  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();
    _controller = TabController(vsync: this, length: 2);
    _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      updatePayableTimes();
    });
    _controller.addListener(() {
      setState(() {
        selectedTabIndex = _controller.index;
        print('Selected Tab Index: $selectedTabIndex');
      });
    });
    fetchBookingData().then((data) {
      setState(() {
        bookingDataNotifier.value = data;
        isLoading = false;
      });
      updatePayableTimes(); // Call update once data is fetched
    });
    fetchBookingData(); // Initial fetch
  }
  void updatePayableTimes() {
    final now = DateTime.now();
    final updatedData = bookingDataNotifier.value.map((booking) {
      if (booking.status == 'PARKED' || booking.status == 'Booked') {
        final parkingTime = parseParkingDateTime(
          "${booking.parkeddate} ${booking.parkedtime}",
        );
        final elapsed = now.difference(parkingTime);

        // Debugging: Print elapsed time
        // print('Elapsed Time for ${booking.vehicleNumber}: $elapsed');

        // Ensure we update the payableDuration with correct values
        booking.payableDuration = elapsed;
      }
      return booking;
    }).toList();

    // Trigger a rebuild of the widget with the updated data
    bookingDataNotifier.value = updatedData;
  }

  // Your existing fetchBookingData function
  Future<List<Bookingdata>> fetchBookingData() async {
    setState(() {
      isLoading = true; // Set loading to true when fetching data
    });

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
      throw 'Error fetching data: ${response.statusCode}';
    }
  }

// Function to add 'st', 'nd', 'rd', 'th' suffix

  DateTime parseParkingDateTime(String dateTimeString) {
    // Example input: "06-12-2024 11:04 AM"
    final parts = dateTimeString.split(' ');
    final dateParts = parts[0].split('-');
    final timeParts = parts[1].split(':'); // Change from '.' to ':'

    int day = int.parse(dateParts[0]);
    int month = int.parse(dateParts[1]);
    int year = int.parse(dateParts[2]);

    int hour = int.parse(timeParts[0]);
    int minute = int.parse(timeParts[1]);

    // Handle AM/PM
    if (parts[2] == 'PM' && hour != 12) {
      hour += 12; // Convert to 24-hour format
    } else if (parts[2] == 'AM' && hour == 12) {
      hour = 0; // Midnight case
    }

    return DateTime(year, month, day, hour, minute);
  }
  Duration getTotalParkedTime(String parkingDateTimeString) {
    DateTime parkingDateTime = parseParkingDateTime(parkingDateTimeString);
    DateTime now = DateTime.now(); // You can replace this with server time if available

    Duration difference = now.difference(parkingDateTime);

    if (difference.isNegative) {
      return Duration.zero; // Return zero duration if the parking time has not started yet
    }

    return difference; // Return the duration
  }
  @override
  void dispose() {
    // _timer.cancel();
    bookingDataNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final int currentSegment = _HomeScreenState()._currentSegment;
    return Container(

      decoration: BoxDecoration(
        // color: ColorUtils.primarycolor(),
        borderRadius: BorderRadius.circular(5),  // Circular border
        // border: Border.all(
        //   color: ColorUtils.primarycolor(),  // Border color, change as needed
        //   width: 0,           // Border width, adjust as needed
        // ),
      ),
      child: TabContainer(
        controller: _controller,  // Ensure the controller is passed here
        borderRadius: BorderRadius.circular(10),  // Ensure this is passed as well
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
        colors: const <Color>[Color(0xFFFFFFFF), Color(0xFFFFFFFF)],
        selectedTextStyle: GoogleFonts.poppins(
          fontSize: 15.0,
          color: ColorUtils.primarycolor(),
        ),
        unselectedTextStyle: GoogleFonts.poppins(
          fontSize: 13.0,
          color: Colors.black, // Set default unselected color
        ),
        tabs: _getTabs(),
        children: [
          // Provide content for the "On Parking" tab
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: ValueListenableBuilder<List<Bookingdata>>(
                valueListenable: bookingDataNotifier,
                builder: (context, bookingData, child) {
                  if (bookingData.isEmpty) {
                    // Show CircularProgressIndicator only if the data is still loading
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('Nothing Parked (Others)'),
                      ],
                    );
                  }

                  // Filter the data
                  final filteredData = bookingData.where((booking) {
                    try {

                      return
                        booking.Vendorid == widget.vendorid &&
                            (booking.sts == "Instant" || booking.sts == "Schedule") &&
                            (booking.status == 'Booked' || booking.status == 'PARKED'|| booking.status == 'Parked') &&
                            booking.vehicletype == 'Others';
                    } catch (e) {
                      return false; // Skip invalid entries
                    }
                  }).toList();

                  if (filteredData.isEmpty) {
                    // Show "No data available" if filtering results in an empty list
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('Nothing Parked (Others)'),
                      ],
                    );
                  }

                  // Show the filtered data in a ListView
                  return RefreshIndicator(
                    onRefresh: () async {
                      // Call the method to fetch data again
                      await fetchBookingData();
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];

                          return othersdashleft(currentTabIndex: 2,vehicle: vehicle);

                        },
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: FutureBuilder<List<Bookingdata>>(
                future: fetchBookingData(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Column(
                      children: [
                        SizedBox(height: 150,),
                        Center(child: CircularProgressIndicator()),
                      ],
                    );
                  } else if (snapshot.hasError) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('Nothing Parked (Others)'),
                      ],
                    );
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('Nothing Parked (Others)'),
                      ],
                    );
                  } else {

                    final filteredData = snapshot.data!.where((booking) {
                      // Ensure exitvehicledate is not null or empty
                      if (booking.exitvehicledate == null || booking.exitvehicledate!.isEmpty) return false;

                      // Parse exitvehicledate safely (assuming format: dd-mm-yyyy)
                      final parts = booking.exitvehicledate!.split('-');
                      if (parts.length != 3) return false;

                      final exitDay = int.tryParse(parts[0]);
                      final exitMonth = int.tryParse(parts[1]);
                      final exitYear = int.tryParse(parts[2]);
                      if (exitDay == null || exitMonth == null || exitYear == null) return false;

                      final exitDate = DateTime(exitYear, exitMonth, exitDay);

                      // Check if vendor matches
                      bool isMatchingVendor = booking.Vendorid == widget.vendorid;
                      print('Booking Vendor ID: ${booking.Vendorid}, Widget Vendor ID: ${widget.vendorid}, Match: $isMatchingVendor');

                      // Check if vehicle type is 'Others'
                      bool isVehicleOther = booking.vehicletype == 'Others';
                      print('Booking Vehicle Type: ${booking.vehicletype}, Is Others: $isVehicleOther');

                      // Check status
                      bool isCompleted = booking.status.toUpperCase() == 'COMPLETED';
                      print('Booking Status: ${booking.status}, Is Completed: $isCompleted');

                      // Compare exit date with today
                      final now = DateTime.now();
                      final today = DateTime(now.year, now.month, now.day);
                      bool isSameDay = exitDate.year == today.year &&
                          exitDate.month == today.month &&
                          exitDate.day == today.day;

                      // Final filter condition
                      return isMatchingVendor && isVehicleOther && isCompleted && isSameDay;
                    }).toList();

                    print('Filtered "Others" Data Count: ${filteredData.length}');

// Debugging: print final filtered data
                    print('Filtered Data: $filteredData');


                    // If no filtered data, show message
                    if (filteredData.isEmpty) {
                      return const Column(
                        children: [
                          SizedBox(height: 150),
                          Text('Nothing Parked (Others)'),
                        ],
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];
                          return vendordashright(vehicle: vehicle);
                        },
                      ),
                    );
                  }
                },
              ),
            ),
          ),


        ],
      ),
    );
  }

  List<Widget> _getTabs() {
    return [
      // Customer Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon(
          //   Icons.local_parking,
          //   color: selectedTabIndex == 0 ? Colors.black : Colors.black,
          // ),
          const SizedBox(width: 8),
          Text(
            'On Parking',
            style: GoogleFonts.poppins(
              color: selectedTabIndex == 0 ? Colors.black : Colors.black,
            ),
          ),
        ],
      ),
      // Vendor Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon(
          //   Icons.verified_outlined,
          //   color: selectedTabIndex == 1 ? Colors.black : Colors.black,
          // ),
          const SizedBox(width: 8),
          Text(
            'Completed',
            style: GoogleFonts.poppins(
              color: selectedTabIndex == 1 ? Colors.black : Colors.black,
            ),
          ),
        ],
      ),
    ];
  }
  String formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0'); // Ensure two digits
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0'); // Ensure two digits
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0'); // Ensure two digits

    return '$hours.$minutes.$seconds'; // Format as HH.MM.SS
  }
}

class cardashleft extends StatelessWidget {

  final Bookingdata vehicle; // Expecting Bookingdata type
  final int currentTabIndex; // Add this parameter
  const cardashleft({super.key, required this.vehicle,required this.currentTabIndex,});

  String _formatDuration(Duration? duration) {
    if (duration == null) return 'N/A';
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
  String formatWithSuffix(DateTime date) {
    int day = date.day;
    String suffix = "th";
    if (!(day >= 11 && day <= 13)) {
      switch (day % 10) {
        case 1:
          suffix = "st";
          break;
        case 2:
          suffix = "nd";
          break;
        case 3:
          suffix = "rd";
          break;
      }
    }
    String formattedMonthYear = DateFormat("MMMM yyyy").format(date);
    return "$day$suffix $formattedMonthYear";
  }

  @override
  Widget build(BuildContext context) {
    final formattedPayableDuration = vehicle.payableDuration != null
        ? _formatDuration(vehicle.payableDuration)
        : 'N/A';
    final String parkingDate = vehicle.parkingDate; // e.g., '19-02-2025'
    final String parkingTime = vehicle.parkingTime; // e.g., '10:20 PM'
    final String bookedDate = vehicle.bookingDate; // e.g., '19-02-2025'
    final String bookedTime = vehicle.bookingTime; // e.g., '10:20 PM'
    DateTime parsedDate = DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);
    String formattedDate = formatWithSuffix(parsedDate);

    final String combinedDateTimeString = '$parkingDate $parkingTime';
    final String bookingcombine = '$bookedDate $bookedTime';
    DateTime? combinebook;
    try {
      combinebook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingcombine);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinebook = null;
    }
    String bookcom = combinebook != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinebook)
        : 'N/A';

    DateTime? combinedDateTime;
    try {
      combinedDateTime = DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinedDateTime = null;
    }
    String formattedDateTime = combinedDateTime != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
        : 'N/A';
    return GestureDetector(
      onTap: ()
      {

      },
      child: SizedBox(
        height: 120,
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 30,
              right: 0,
              child: Container(
                height: 85,
                decoration: BoxDecoration(
                  color: vehicle.status == 'PARKED'
                      ? ColorUtils.primarycolor()
                      : ColorUtils.primarycolor(),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(30),
                    bottomRight: Radius.circular(30),
                  ),
                  boxShadow: [
                    // Moved inside BoxDecoration
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 2,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                alignment:
                Alignment.bottomCenter, // Center the text
                child: Padding(
                  padding: const EdgeInsets.all(
                      5.0), // Added padding for better spacing
                  child: Text(
                    ' $formattedDate, ${vehicle.parkingTime}',
                    style: GoogleFonts.poppins(
                      color: Colors.white,

                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
            Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(20),
                    ),
                    // border: Border.all(color: Colors.black, width: 0.5),
                    boxShadow: [
                      BoxShadow(
                        color:
                        Colors.black.withOpacity(0.1),
                        spreadRadius: 1,
                        blurRadius: 2,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment:
                    CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.only(
                            left: 14,
                            top: 2,
                            right: 0.0,
                            bottom: 0.0),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(), // Your primary color
                              width: 0.5, // Border width
                            ),
                          ),
                          borderRadius:
                          const BorderRadius.only(
                            topLeft: Radius.circular(5.0),
                            topRight: Radius.circular(5.0),
                          ),
                          color:
                          vehicle.status == 'Cancelled'
                              ? Colors.white
                              : Colors.white,
                        ),
                        child: Row(
                          mainAxisAlignment:
                          MainAxisAlignment
                              .spaceBetween,
                          children: [
                            // Vehicle Number
                            Text(
                              vehicle.vehicleNumber,
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                color: vehicle.status ==
                                    'Cancelled'
                                    ? Colors.red
                                    : ColorUtils
                                    .primarycolor(),
                                fontWeight: FontWeight.bold,
                              ),
                            ),

                            // Spacer to push the status and buttons to the right
                            const Spacer(),

                            // Conditional rendering of status text and buttons

                            if (vehicle.status ==
                                "Cancelled")
                              Padding(
                                padding:
                                const EdgeInsets.only(
                                    right: 12.0),
                                child: Text(
                                  " ${vehicle.cancelledStatus}",
                                  style: GoogleFonts.poppins(
                                      color: vehicle
                                          .status ==
                                          'Cancelled'
                                          ? Colors.red
                                          : ColorUtils
                                          .primarycolor(),
                                      fontWeight:
                                      FontWeight.bold),
                                ),
                              ),
                            // if (vehicle.cancelledStatus
                            //     ?.isEmpty ??
                            //     true) // Check if cancelledStatus is empty
                            //   Padding(
                            //     padding:
                            //     const EdgeInsets.only(
                            //         right: 12.0),
                            //     child: Text(
                            //       " ${vehicle.status}", // Display vehicle status if cancelledStatus is empty
                            //       style:
                            //       GoogleFonts.poppins(
                            //         color: vehicle.status ==
                            //             'Cancelled'
                            //             ? Colors.red
                            //             : ColorUtils
                            //             .primarycolor(),
                            //         fontWeight:
                            //         FontWeight.bold,
                            //       ),
                            //     ),
                            //   ),
                            //





                            if (vehicle.status == "PARKED")
                              Padding(
                                padding: const EdgeInsets.only(bottom: 5.0),
                                child: SizedBox(
                                  height: 25,
                                  child: Padding(
                                    padding:
                                    const EdgeInsets.only(
                                        right: 8.0),
                                    child: ElevatedButton(
                                      onPressed: () {
                                        showModalBottomSheet(
                                          context: context,
                                          isScrollControlled: true,
                                          backgroundColor: Colors.transparent,
                                          builder: (context) {
                                            return DraggableScrollableSheet(
                                              expand: false,
                                              builder: (context, scrollController) {
                                                return Container(
                                                  decoration: const BoxDecoration(
                                                    color: Colors.white,
                                                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                                  ),
                                                  child: Exitpage(
                                                    currentTabIndex: currentTabIndex, //
                                                    userid: vehicle.userid,
                                                    otp:vehicle.otp,
                                                    vehicletype: vehicle.vehicletype,
                                                    bookingid: vehicle.id,
                                                    parkingdate: vehicle.parkingDate,
                                                    vehiclenumber: vehicle.vehicleNumber,
                                                    username: vehicle.username,
                                                    phoneno: vehicle.mobilenumber,
                                                    parkingtime: vehicle.parkingTime,
                                                    bookingtypetemporary: vehicle.status,
                                                    sts: vehicle.sts,
                                                    cartype: vehicle.Cartype,
                                                    vendorid: vehicle.Vendorid,
                                                    bookType:vehicle.bookType,
                                                  ),
                                                );
                                              },
                                            );
                                          },
                                        );
                                      },
                                      style: ElevatedButton
                                          .styleFrom(
                                        backgroundColor: Colors
                                            .white, // Transparent background
                                        foregroundColor: Colors
                                            .red, // Text & Icon color
                                        padding:
                                        const EdgeInsets
                                            .symmetric(
                                            horizontal:
                                            10,
                                            vertical: 5),
                                        minimumSize:
                                        const Size(0, 0),
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                          const BorderRadius
                                              .all(Radius
                                              .circular(
                                              5)),
                                          side:
                                          BorderSide(
                                            color: ColorUtils.primarycolor(), // Border color
                                            width: 0.5,
                                          ),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize:
                                        MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons
                                                .qr_code_scanner,
                                            color: ColorUtils.primarycolor(), // Icon color
                                            size: 14,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            'Exit',
                                            style: GoogleFonts
                                                .poppins(
                                              fontSize: 10,
                                              fontWeight:
                                              FontWeight
                                                  .bold,
                                              color:  ColorUtils.primarycolor(), // Text color
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
                      const SizedBox(height: 0),
                      Row(
                        crossAxisAlignment:
                        CrossAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.only(
                                left: 12.0,
                                right: 15.0,
                                top: 6.0,
                                bottom:
                                6.0), // Optional: Adds space inside the container
                            decoration: BoxDecoration(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(),
                              borderRadius:
                              const BorderRadius.only(
                                topRight:
                                Radius.circular(20.0),
                                bottomRight:
                                Radius.circular(20.0),
                              ),
                            ),
                            child: Icon(
                              vehicle.vehicletype == "Car"
                                  ? Icons.directions_car
                                  : vehicle.vehicletype == "Bike"
                                  ? Icons.motorcycle
                                  : Icons.directions_transit, // Replace with any icon for "Others"
                              size: 20,
                              color: Colors.white,
                            ),

                          ),
                          const SizedBox(height: 0),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                              CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const SizedBox(
                                      height: 10,
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8.0),
                                      child: Row(
                                        children: [
                                          Text(
                                            'Parking Schedule: ',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12, // Reduced font size
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            ' ${vehicle.parkingDate}',
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            vehicle.parkingTime,
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                        ],
                                      ),
                                    ),

                                  ],
                                ),
                                Row(
                                  children: [
                                    Text(
                                      'Payable Time:',
                                      style: GoogleFonts
                                          .poppins(
                                          fontSize: 14,
                                          fontWeight:
                                          FontWeight
                                              .bold),
                                    ),
                                    Text(" $formattedPayableDuration"),
                                  ],
                                ),



                                Row(
                                  mainAxisAlignment:
                                  MainAxisAlignment
                                      .start,
                                  children: [
                                    Container(
                                      height: 10,
                                    ),
                                    if (vehicle.status ==
                                        "PARKED")
                                      Container(
                                        // height: 50,
                                        alignment: Alignment
                                            .topCenter,


                                      ),
                                    const Spacer(),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );


  }
}
class bikedashleft extends StatelessWidget {

  final Bookingdata vehicle; // Expecting Bookingdata type
  final int currentTabIndex; // Add this parameter
  const bikedashleft({super.key, required this.vehicle,required this.currentTabIndex,});
  String formatWithSuffix(DateTime date) {
    int day = date.day;
    String suffix = "th";
    if (!(day >= 11 && day <= 13)) {
      switch (day % 10) {
        case 1:
          suffix = "st";
          break;
        case 2:
          suffix = "nd";
          break;
        case 3:
          suffix = "rd";
          break;
      }
    }
    String formattedMonthYear = DateFormat("MMMM yyyy").format(date);
    return "$day$suffix $formattedMonthYear";
  }

  String _formatDuration(Duration? duration) {
    if (duration == null) return 'N/A';
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
  @override
  Widget build(BuildContext context) {
    final formattedPayableDuration = vehicle.payableDuration != null
        ? _formatDuration(vehicle.payableDuration)
        : 'N/A';
    final String parkingDate = vehicle.parkingDate; // e.g., '19-02-2025'
    final String parkingTime = vehicle.parkingTime; // e.g., '10:20 PM'
    final String bookedDate = vehicle.bookingDate; // e.g., '19-02-2025'
    final String bookedTime = vehicle.bookingTime; // e.g., '10:20 PM'
    DateTime parsedDate = DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);
    String formattedDate = formatWithSuffix(parsedDate);

    final String combinedDateTimeString = '$parkingDate $parkingTime';
    final String bookingcombine = '$bookedDate $bookedTime';
    DateTime? combinebook;
    try {
      combinebook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingcombine);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinebook = null;
    }
    String bookcom = combinebook != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinebook)
        : 'N/A';

    DateTime? combinedDateTime;
    try {
      combinedDateTime = DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinedDateTime = null;
    }
    String formattedDateTime = combinedDateTime != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
        : 'N/A';
    return GestureDetector(
      onTap: ()
      {
        // Navigator.push(
        //   context,
        //   MaterialPageRoute(
        //     builder: (context) => vendorParkingDetails(
        //       sts:vehicle.sts,
        //       bookingtype: vehicle.bookingtype,
        //       vehiclenumber: vehicle.vehicleNumber,
        //       vendorname: vehicle.Vendorid,
        //       vendorid: vehicle.Vendorid,
        //       parkingdate: vehicle.parkingDate,
        //       parkingtime: vehicle.parkingTime,
        //       bookedid: vehicle.id,
        //       bookeddate: formattedDateTime,
        //       schedule: bookcom,
        //       otp:vehicle.otp,
        //       status: vehicle.status,
        //       vehicletype: vehicle.vehicletype,
        //     ),
        //   ),
        // );
      },
      child: SizedBox(
        height: 120,
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 30,
              right: 0,
              child: Container(
                height: 85,
                decoration: BoxDecoration(
                  color: vehicle.status == 'PARKED'
                      ? ColorUtils.primarycolor()
                      : ColorUtils.primarycolor(),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(30),
                    bottomRight: Radius.circular(30),
                  ),
                  boxShadow: [
                    // Moved inside BoxDecoration
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 2,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                alignment:
                Alignment.bottomCenter, // Center the text
                child: Padding(
                  padding: const EdgeInsets.all(
                      5.0), // Added padding for better spacing
                  child: Text(
                    ' $formattedDate, ${vehicle.parkingTime}',
                    style: GoogleFonts.poppins(
                      color: Colors.white,

                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
            Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(20),
                    ),
                    // border: Border.all(color: Colors.black, width: 0.5),
                    boxShadow: [
                      BoxShadow(
                        color:
                        Colors.black.withOpacity(0.1),
                        spreadRadius: 1,
                        blurRadius: 2,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment:
                    CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.only(
                            left: 14,
                            top: 2,
                            right: 0.0,
                            bottom: 0.0),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(), // Your primary color
                              width: 0.5, // Border width
                            ),
                          ),
                          borderRadius:
                          const BorderRadius.only(
                            topLeft: Radius.circular(5.0),
                            topRight: Radius.circular(5.0),
                          ),
                          color:
                          vehicle.status == 'Cancelled'
                              ? Colors.white
                              : Colors.white,
                        ),
                        child: Row(
                          mainAxisAlignment:
                          MainAxisAlignment
                              .spaceBetween,
                          children: [
                            // Vehicle Number
                            Text(
                              vehicle.vehicleNumber,
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                color: vehicle.status ==
                                    'Cancelled'
                                    ? Colors.red
                                    : ColorUtils
                                    .primarycolor(),
                                fontWeight: FontWeight.bold,
                              ),
                            ),

                            // Spacer to push the status and buttons to the right
                            const Spacer(),

                            // Conditional rendering of status text and buttons

                            if (vehicle.status ==
                                "Cancelled")
                              Padding(
                                padding:
                                const EdgeInsets.only(
                                    right: 12.0),
                                child: Text(
                                  " ${vehicle.cancelledStatus}",
                                  style: GoogleFonts.poppins(
                                      color: vehicle
                                          .status ==
                                          'Cancelled'
                                          ? Colors.red
                                          : ColorUtils
                                          .primarycolor(),
                                      fontWeight:
                                      FontWeight.bold),
                                ),
                              ),
                            // if (vehicle.cancelledStatus
                            //     ?.isEmpty ??
                            //     true) // Check if cancelledStatus is empty
                            //   Padding(
                            //     padding:
                            //     const EdgeInsets.only(
                            //         right: 12.0),
                            //     child: Text(
                            //       " ${vehicle.status}", // Display vehicle status if cancelledStatus is empty
                            //       style:
                            //       GoogleFonts.poppins(
                            //         color: vehicle.status ==
                            //             'Cancelled'
                            //             ? Colors.red
                            //             : ColorUtils
                            //             .primarycolor(),
                            //         fontWeight:
                            //         FontWeight.bold,
                            //       ),
                            //     ),
                            //   ),
                            //





                            if (vehicle.status == "PARKED")
                              Padding(
                                padding: const EdgeInsets.only(bottom: 5.0),
                                child: SizedBox(
                                  height: 25,
                                  child: Padding(
                                    padding:
                                    const EdgeInsets.only(
                                        right: 8.0),
                                    child: ElevatedButton(
                                      onPressed: () {
                                        showModalBottomSheet(
                                          context: context,
                                          isScrollControlled: true,
                                          backgroundColor: Colors.transparent,
                                          builder: (context) {
                                            return DraggableScrollableSheet(
                                              expand: false,
                                              builder: (context, scrollController) {
                                                return Container(
                                                  decoration: const BoxDecoration(
                                                    color: Colors.white,
                                                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                                  ),
                                                  child: Exitpage(
                                                    currentTabIndex: currentTabIndex, //
                                                    userid: vehicle.userid,
                                                    otp:vehicle.otp,
                                                    vehicletype: vehicle.vehicletype,
                                                    bookingid: vehicle.id,
                                                    parkingdate: vehicle.parkingDate,
                                                    vehiclenumber: vehicle.vehicleNumber,
                                                    username: vehicle.username,
                                                    phoneno: vehicle.mobilenumber,
                                                    parkingtime: vehicle.parkingTime,
                                                    bookingtypetemporary: vehicle.status,
                                                    sts: vehicle.sts,
                                                    cartype: vehicle.Cartype,
                                                    vendorid: vehicle.Vendorid,
                                                    bookType:vehicle.bookType,
                                                  ),
                                                );
                                              },
                                            );
                                          },
                                        );
                                      },
                                      style: ElevatedButton
                                          .styleFrom(
                                        backgroundColor: Colors
                                            .white, // Transparent background
                                        foregroundColor: Colors
                                            .red, // Text & Icon color
                                        padding:
                                        const EdgeInsets
                                            .symmetric(
                                            horizontal:
                                            10,
                                            vertical: 5),
                                        minimumSize:
                                        const Size(0, 0),
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                          const BorderRadius
                                              .all(Radius
                                              .circular(
                                              5)),
                                          side:
                                          BorderSide(
                                            color: ColorUtils.primarycolor(), // Border color
                                            width: 0.5,
                                          ),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize:
                                        MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons
                                                .qr_code_scanner,
                                            color: ColorUtils.primarycolor(), // Icon color
                                            size: 14,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            'Exit',
                                            style: GoogleFonts
                                                .poppins(
                                              fontSize: 10,
                                              fontWeight:
                                              FontWeight
                                                  .bold,
                                              color:  ColorUtils.primarycolor(), // Text color
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
                      const SizedBox(height: 0),
                      Row(
                        crossAxisAlignment:
                        CrossAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.only(
                                left: 12.0,
                                right: 15.0,
                                top: 6.0,
                                bottom:
                                6.0), // Optional: Adds space inside the container
                            decoration: BoxDecoration(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(),
                              borderRadius:
                              const BorderRadius.only(
                                topRight:
                                Radius.circular(20.0),
                                bottomRight:
                                Radius.circular(20.0),
                              ),
                            ),
                            child: Icon(
                              vehicle.vehicletype == "Car"
                                  ? Icons.directions_car
                                  : vehicle.vehicletype == "Bike"
                                  ? Icons.motorcycle
                                  : Icons.directions_transit, // Replace with any icon for "Others"
                              size: 20,
                              color: Colors.white,
                            ),

                          ),
                          const SizedBox(height: 0),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                              CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const SizedBox(
                                      height: 10,
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8.0),
                                      child: Row(
                                        children: [
                                          Text(
                                            'Parking Schedule: ',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12, // Reduced font size
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            ' ${vehicle.parkingDate}',
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            vehicle.parkingTime,
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                        ],
                                      ),
                                    ),

                                  ],
                                ),
                                Row(
                                  children: [
                                    Text(
                                      'Payable Time:',
                                      style: GoogleFonts
                                          .poppins(
                                          fontSize: 14,
                                          fontWeight:
                                          FontWeight
                                              .bold),
                                    ),
                                    Text(" $formattedPayableDuration"),
                                  ],
                                ),



                                Row(
                                  mainAxisAlignment:
                                  MainAxisAlignment
                                      .start,
                                  children: [
                                    Container(
                                      height: 10,
                                    ),
                                    if (vehicle.status ==
                                        "PARKED")
                                      Container(
                                        // height: 50,
                                        alignment: Alignment
                                            .topCenter,


                                      ),
                                    const Spacer(),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );


  }
}
class othersdashleft extends StatelessWidget {

  final Bookingdata vehicle; // Expecting Bookingdata type
  final int currentTabIndex; // Add this parameter
  const othersdashleft({super.key, required this.vehicle,required this.currentTabIndex,});
  String formatWithSuffix(DateTime date) {
    int day = date.day;
    String suffix = "th";
    if (!(day >= 11 && day <= 13)) {
      switch (day % 10) {
        case 1:
          suffix = "st";
          break;
        case 2:
          suffix = "nd";
          break;
        case 3:
          suffix = "rd";
          break;
      }
    }
    String formattedMonthYear = DateFormat("MMMM yyyy").format(date);
    return "$day$suffix $formattedMonthYear";
  }

  String _formatDuration(Duration? duration) {
    if (duration == null) return 'N/A';
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
  @override
  Widget build(BuildContext context) {
    final formattedPayableDuration = vehicle.payableDuration != null
        ? _formatDuration(vehicle.payableDuration)
        : 'N/A';
    final String parkingDate = vehicle.parkingDate; // e.g., '19-02-2025'
    final String parkingTime = vehicle.parkingTime; // e.g., '10:20 PM'
    final String bookedDate = vehicle.bookingDate; // e.g., '19-02-2025'
    final String bookedTime = vehicle.bookingTime; // e.g., '10:20 PM'

    final String combinedDateTimeString = '$parkingDate $parkingTime';
    final String bookingcombine = '$bookedDate $bookedTime';
    DateTime? combinebook;
    try {
      combinebook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingcombine);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinebook = null;
    }
    String bookcom = combinebook != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinebook)
        : 'N/A';
    DateTime parsedDate = DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);
    String formattedDate = formatWithSuffix(parsedDate);

    DateTime? combinedDateTime;
    try {
      combinedDateTime = DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinedDateTime = null;
    }
    String formattedDateTime = combinedDateTime != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
        : 'N/A';
    return GestureDetector(
      onTap: ()
      {
        // Navigator.push(
        //   context,
        //   MaterialPageRoute(
        //     builder: (context) => vendorParkingDetails(
        //       sts:vehicle.sts,
        //       bookingtype: vehicle.bookingtype,
        //       vehiclenumber: vehicle.vehicleNumber,
        //       vendorname: vehicle.Vendorid,
        //       vendorid: vehicle.Vendorid,
        //       parkingdate: vehicle.parkingDate,
        //       parkingtime: vehicle.parkingTime,
        //       bookedid: vehicle.id,
        //       bookeddate: formattedDateTime,
        //       schedule: bookcom,
        //       otp:vehicle.otp,
        //       status: vehicle.status,
        //       vehicletype: vehicle.vehicletype,
        //     ),
        //   ),
        // );
      },
      child: SizedBox(
        height: 120,
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 30,
              right: 0,
              child: Container(
                height: 85,
                decoration: BoxDecoration(
                  color: vehicle.status == 'PARKED'
                      ? ColorUtils.primarycolor()
                      : ColorUtils.primarycolor(),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(30),
                    bottomRight: Radius.circular(30),
                  ),
                  boxShadow: [
                    // Moved inside BoxDecoration
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 2,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                alignment:
                Alignment.bottomCenter, // Center the text
                child: Padding(
                  padding: const EdgeInsets.all(
                      5.0), // Added padding for better spacing
                  child: Text(
                    ' $formattedDate, ${vehicle.parkingTime}',
                    style: GoogleFonts.poppins(
                      color: Colors.white,

                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
            Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(20),
                    ),
                    // border: Border.all(color: Colors.black, width: 0.5),
                    boxShadow: [
                      BoxShadow(
                        color:
                        Colors.black.withOpacity(0.1),
                        spreadRadius: 1,
                        blurRadius: 2,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment:
                    CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.only(
                            left: 14,
                            top: 2,
                            right: 0.0,
                            bottom: 0.0),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(), // Your primary color
                              width: 0.5, // Border width
                            ),
                          ),
                          borderRadius:
                          const BorderRadius.only(
                            topLeft: Radius.circular(5.0),
                            topRight: Radius.circular(5.0),
                          ),
                          color:
                          vehicle.status == 'Cancelled'
                              ? Colors.white
                              : Colors.white,
                        ),
                        child: Row(
                          mainAxisAlignment:
                          MainAxisAlignment
                              .spaceBetween,
                          children: [
                            // Vehicle Number
                            Text(
                              vehicle.vehicleNumber,
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                color: vehicle.status ==
                                    'Cancelled'
                                    ? Colors.red
                                    : ColorUtils
                                    .primarycolor(),
                                fontWeight: FontWeight.bold,
                              ),
                            ),

                            // Spacer to push the status and buttons to the right
                            const Spacer(),

                            // Conditional rendering of status text and buttons

                            if (vehicle.status ==
                                "Cancelled")
                              Padding(
                                padding:
                                const EdgeInsets.only(
                                    right: 12.0),
                                child: Text(
                                  " ${vehicle.cancelledStatus}",
                                  style: GoogleFonts.poppins(
                                      color: vehicle
                                          .status ==
                                          'Cancelled'
                                          ? Colors.red
                                          : ColorUtils
                                          .primarycolor(),
                                      fontWeight:
                                      FontWeight.bold),
                                ),
                              ),
                            // if (vehicle.cancelledStatus
                            //     ?.isEmpty ??
                            //     true) // Check if cancelledStatus is empty
                            //   Padding(
                            //     padding:
                            //     const EdgeInsets.only(
                            //         right: 12.0),
                            //     child: Text(
                            //       " ${vehicle.status}", // Display vehicle status if cancelledStatus is empty
                            //       style:
                            //       GoogleFonts.poppins(
                            //         color: vehicle.status ==
                            //             'Cancelled'
                            //             ? Colors.red
                            //             : ColorUtils
                            //             .primarycolor(),
                            //         fontWeight:
                            //         FontWeight.bold,
                            //       ),
                            //     ),
                            //   ),
                            //





                            if (vehicle.status == "PARKED")
                              Padding(
                                padding: const EdgeInsets.only(bottom: 5.0),
                                child: SizedBox(
                                  height: 25,
                                  child: Padding(
                                    padding:
                                    const EdgeInsets.only(
                                        right: 8.0),
                                    child: ElevatedButton(
                                      onPressed: () {
                                        showModalBottomSheet(
                                          context: context,
                                          isScrollControlled: true,
                                          backgroundColor: Colors.transparent,
                                          builder: (context) {
                                            return DraggableScrollableSheet(
                                              expand: false,
                                              builder: (context, scrollController) {
                                                return Container(
                                                  decoration: const BoxDecoration(
                                                    color: Colors.white,
                                                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                                  ),
                                                  child: Exitpage(
                                                    currentTabIndex: currentTabIndex, //
                                                    userid: vehicle.userid,
                                                    otp:vehicle.otp,
                                                    vehicletype: vehicle.vehicletype,
                                                    bookingid: vehicle.id,
                                                    parkingdate: vehicle.parkingDate,
                                                    vehiclenumber: vehicle.vehicleNumber,
                                                    username: vehicle.username,
                                                    phoneno: vehicle.mobilenumber,
                                                    parkingtime: vehicle.parkingTime,
                                                    bookingtypetemporary: vehicle.status,
                                                    sts: vehicle.sts,
                                                    cartype: vehicle.Cartype,
                                                    vendorid: vehicle.Vendorid,
                                                    bookType:vehicle.bookType,
                                                  ),
                                                );
                                              },
                                            );
                                          },
                                        );
                                      },
                                      style: ElevatedButton
                                          .styleFrom(
                                        backgroundColor: Colors
                                            .white, // Transparent background
                                        foregroundColor: Colors
                                            .red, // Text & Icon color
                                        padding:
                                        const EdgeInsets
                                            .symmetric(
                                            horizontal:
                                            10,
                                            vertical: 5),
                                        minimumSize:
                                        const Size(0, 0),
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                          const BorderRadius
                                              .all(Radius
                                              .circular(
                                              5)),
                                          side:
                                          BorderSide(
                                            color: ColorUtils.primarycolor(), // Border color
                                            width: 0.5,
                                          ),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize:
                                        MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons
                                                .qr_code_scanner,
                                            color: ColorUtils.primarycolor(), // Icon color
                                            size: 14,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            'Exit',
                                            style: GoogleFonts
                                                .poppins(
                                              fontSize: 10,
                                              fontWeight:
                                              FontWeight
                                                  .bold,
                                              color:  ColorUtils.primarycolor(), // Text color
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
                      const SizedBox(height: 0),
                      Row(
                        crossAxisAlignment:
                        CrossAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.only(
                                left: 12.0,
                                right: 15.0,
                                top: 6.0,
                                bottom:
                                6.0), // Optional: Adds space inside the container
                            decoration: BoxDecoration(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(),
                              borderRadius:
                              const BorderRadius.only(
                                topRight:
                                Radius.circular(20.0),
                                bottomRight:
                                Radius.circular(20.0),
                              ),
                            ),
                            child: Icon(
                              vehicle.vehicletype == "Car"
                                  ? Icons.directions_car
                                  : vehicle.vehicletype == "Bike"
                                  ? Icons.motorcycle
                                  : Icons.directions_transit, // Replace with any icon for "Others"
                              size: 20,
                              color: Colors.white,
                            ),

                          ),
                          const SizedBox(height: 0),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                              CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const SizedBox(
                                      height: 10,
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8.0),
                                      child: Row(
                                        children: [
                                          Text(
                                            'Parking Schedule: ',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12, // Reduced font size
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            ' ${vehicle.parkingDate}',
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            vehicle.parkingTime,
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                        ],
                                      ),
                                    ),

                                  ],
                                ),
                                Row(
                                  children: [
                                    Text(
                                      'Payable Time:',
                                      style: GoogleFonts
                                          .poppins(
                                          fontSize: 14,
                                          fontWeight:
                                          FontWeight
                                              .bold),
                                    ),
                                    Text(" $formattedPayableDuration"),
                                  ],
                                ),



                                Row(
                                  mainAxisAlignment:
                                  MainAxisAlignment
                                      .start,
                                  children: [
                                    Container(
                                      height: 10,
                                    ),
                                    if (vehicle.status ==
                                        "PARKED")
                                      Container(
                                        // height: 50,
                                        alignment: Alignment
                                            .topCenter,


                                      ),
                                    const Spacer(),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );


  }
}
class vendordashright extends StatelessWidget {

  final Bookingdata vehicle; // Expecting Bookingdata type
  const vendordashright({super.key, required this.vehicle });

  @override
  Widget build(BuildContext context) {

    final String parkingDate = vehicle.parkingDate; // e.g., '19-02-2025'
    final String parkingTime = vehicle.parkingTime; // e.g., '10:20 PM'
    final String bookedDate = vehicle.bookingDate; // e.g., '19-02-2025'
    final String bookedTime = vehicle.bookingTime; // e.g., '10:20 PM'
    String formatWithSuffix(DateTime date) {
      int day = date.day;
      String suffix = "th";
      if (!(day >= 11 && day <= 13)) {
        switch (day % 10) {
          case 1:
            suffix = "st";
            break;
          case 2:
            suffix = "nd";
            break;
          case 3:
            suffix = "rd";
            break;
        }
      }
      String formattedMonthYear = DateFormat("MMMM yyyy").format(date);
      return "$day$suffix $formattedMonthYear";
    }

    final String combinedDateTimeString = '$parkingDate $parkingTime';
    final String bookingcombine = '$bookedDate $bookedTime';
    DateTime? combinebook;
    try {
      combinebook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingcombine);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinebook = null;
    }
    String bookcom = combinebook != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinebook)
        : 'N/A';
    DateTime parsedDate = DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);
    String formattedDate = formatWithSuffix(parsedDate);

    DateTime? combinedDateTime;
    try {
      combinedDateTime = DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
    } catch (e) {
      print('Error parsing combined date and time: $e');
      combinedDateTime = null;
    }
    String formattedDateTime = combinedDateTime != null
        ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
        : 'N/A';
    return GestureDetector(
      onTap: ()
      {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => vendorParkingDetails(
              parkeddate: vehicle.parkeddate,
              parkedtime: vehicle.parkedtime,
              subscriptionenddate:vehicle.subscriptionenddate,
              exitdate:vehicle.exitvehicledate,
              exittime:vehicle.exitvehicletime,
              invoiceid: vehicle.invoiceid,
              amount: vehicle.amount,
              totalamount:vehicle.totalamout,
              invoice: vehicle.invoice,
              username:vehicle.username,
              mobilenumber: vehicle.mobilenumber,
              sts:vehicle.sts,
              bookingtype: vehicle.bookingtype,
              otp: vehicle.otp,
              vehiclenumber: vehicle.vehicleNumber,
              vendorname: vehicle.vendorname,
              vendorid: vehicle.Vendorid,
              parkingdate: vehicle.parkingDate,
              parkingtime: vehicle.parkingTime,
              bookedid: vehicle.id,
              bookeddate: formattedDateTime,
              schedule: bookcom,
              status: vehicle.status,
              vehicletype: vehicle.vehicletype,
            ),
          ),
        );
      },
      child: SizedBox(
        height: 110,
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 30,
              right: 0,
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  color: vehicle.status == 'PARKED'
                      ? ColorUtils.primarycolor()
                      : ColorUtils.primarycolor(),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(30),
                    bottomRight: Radius.circular(30),
                  ),
                  boxShadow: [
                    // Moved inside BoxDecoration
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 2,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                alignment:
                Alignment.bottomCenter, // Center the text
                child: Padding(
                  padding: const EdgeInsets.all(
                      5.0), // Added padding for better spacing
                  child: Text(
                    ' $formattedDate, ${vehicle.parkingTime}',
                    style: GoogleFonts.poppins(
                      color: Colors.white,

                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
            Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(20),
                    ),
                    // border: Border.all(color: Colors.black, width: 0.5),
                    boxShadow: [
                      BoxShadow(
                        color:
                        Colors.black.withOpacity(0.1),
                        spreadRadius: 1,
                        blurRadius: 2,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment:
                    CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.only(
                            left: 14,
                            top: 2,
                            right: 0.0,
                            bottom: 0.0),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(), // Your primary color
                              width: 0.5, // Border width
                            ),
                          ),
                          borderRadius:
                          const BorderRadius.only(
                            topLeft: Radius.circular(5.0),
                            topRight: Radius.circular(5.0),
                          ),
                          color:
                          vehicle.status == 'Cancelled'
                              ? Colors.white
                              : Colors.white,
                        ),
                        child: Row(
                          mainAxisAlignment:
                          MainAxisAlignment
                              .spaceBetween,
                          children: [
                            // Vehicle Number
                            Text(
                              vehicle.vehicleNumber,
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                color: vehicle.status ==
                                    'Cancelled'
                                    ? Colors.red
                                    : ColorUtils
                                    .primarycolor(),
                                fontWeight: FontWeight.bold,
                              ),
                            ),

                            // Spacer to push the status and buttons to the right
                            const Spacer(),

                            // Conditional rendering of status text and buttons

                            if (vehicle.status ==
                                "Cancelled")
                              Padding(
                                padding:
                                const EdgeInsets.only(
                                    right: 12.0),
                                child: Text(
                                  " ${vehicle.cancelledStatus}",
                                  style: GoogleFonts.poppins(
                                      color: vehicle
                                          .status ==
                                          'Cancelled'
                                          ? Colors.red
                                          : ColorUtils
                                          .primarycolor(),
                                      fontWeight:
                                      FontWeight.bold),
                                ),
                              ),
                            if (vehicle.cancelledStatus
                                ?.isEmpty ??
                                true) // Check if cancelledStatus is empty
                              Padding(
                                padding:
                                const EdgeInsets.only(
                                    right: 12.0),
                                child: Text(
                                  " ${vehicle.status}", // Display vehicle status if cancelledStatus is empty
                                  style:
                                  GoogleFonts.poppins(
                                    color: vehicle.status ==
                                        'Cancelled'
                                        ? Colors.red
                                        : ColorUtils
                                        .primarycolor(),
                                    fontWeight:
                                    FontWeight.bold,
                                  ),
                                ),
                              ),






                            if (vehicle.status == "PARKED")
                              SizedBox(
                                height: 30,
                                child: Padding(
                                  padding:
                                  const EdgeInsets.only(
                                      right: 8.0),
                                  child: ElevatedButton(
                                    onPressed: () {

                                    },
                                    style: ElevatedButton
                                        .styleFrom(
                                      backgroundColor: Colors
                                          .white, // Transparent background
                                      foregroundColor: Colors
                                          .red, // Text & Icon color
                                      padding:
                                      const EdgeInsets
                                          .symmetric(
                                          horizontal:
                                          10,
                                          vertical: 5),
                                      minimumSize:
                                      const Size(0, 0),
                                      shape: RoundedRectangleBorder(
                                        borderRadius:
                                        const BorderRadius
                                            .all(Radius
                                            .circular(
                                            5)),
                                        side:
                                        BorderSide(
                                          color: ColorUtils.primarycolor(), // Border color
                                          width: 0.5,
                                        ),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize:
                                      MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons
                                              .qr_code_scanner,
                                          color: ColorUtils.primarycolor(), // Icon color
                                          size: 16,
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          'Exit',
                                          style: GoogleFonts
                                              .poppins(
                                            fontSize: 12,
                                            fontWeight:
                                            FontWeight
                                                .bold,
                                            color:  ColorUtils.primarycolor(), // Text color
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            const SizedBox(height: 2),

                          ],
                        ),
                      ),

                      Row(
                        crossAxisAlignment:
                        CrossAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.only(
                                left: 12.0,
                                right: 15.0,
                                top: 6.0,
                                bottom:
                                6.0), // Optional: Adds space inside the container
                            decoration: BoxDecoration(
                              color: vehicle.status ==
                                  'Cancelled'
                                  ? Colors.red
                                  : ColorUtils
                                  .primarycolor(),
                              borderRadius:
                              const BorderRadius.only(
                                topRight:
                                Radius.circular(20.0),
                                bottomRight:
                                Radius.circular(20.0),
                              ),
                            ),
                            child: Icon(
                              vehicle.vehicletype == "Car"
                                  ? Icons.directions_car // Car icon
                                  : vehicle.vehicletype == "Bike"
                                  ? Icons.directions_bike // Bike icon
                                  : Icons.directions_transit, // Default for Others
                              size: 20,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 0),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                              CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const SizedBox(
                                      height: 10,
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8.0),
                                      child: Row(
                                        children: [
                                          Text(
                                            'Parking Schedule: ',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12, // Reduced font size
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            ' ${vehicle.parkingDate}',
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            vehicle.parkingTime,
                                            style: GoogleFonts.poppins(fontSize: 12), // Consistent smaller size
                                          ),
                                        ],
                                      ),
                                    ),

                                  ],
                                ),
                                Row(
                                  children: [
                                    Text(
                                      '',
                                      style: GoogleFonts
                                          .poppins(
                                          fontSize: 14,
                                          fontWeight:
                                          FontWeight
                                              .bold),
                                    ),
                                    Text(' ${vehicle.sts}',),
                                  ],
                                ),



                                Row(
                                  mainAxisAlignment:
                                  MainAxisAlignment
                                      .start,
                                  children: [
                                    Container(
                                      height: 10,
                                    ),
                                    if (vehicle.status ==
                                        "PARKED")
                                      Container(
                                        // height: 50,
                                        alignment: Alignment
                                            .topCenter,


                                      ),
                                    const Spacer(),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );




  }
}



class RoundedRectIndicator extends Decoration {
  final BoxPainter _painter;

  RoundedRectIndicator({required Color color, required double radius})
      : _painter = _RoundedRectPainter(color, radius);

  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) => _painter;
}
class _RoundedRectPainter extends BoxPainter {
  final Paint _paint;
  final double radius;

  _RoundedRectPainter(Color color, this.radius)
      : _paint = Paint()
    ..color = color
    ..isAntiAlias = true;

  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final Rect rect = offset & configuration.size!;
    final Rect indicator = Rect.fromLTRB(
      rect.left - 43.5, // Adjust the left padding if necessary
      rect.top,
      rect.right + 37, // Adjust the right padding if necessary
      rect.bottom,
    );
    final RRect rRect = RRect.fromRectAndCorners(
      indicator,
      topLeft: Radius.circular(radius),
      topRight: Radius.circular(radius),
      bottomLeft: const Radius.circular(0), // No rounding for bottom-left
      bottomRight: const Radius.circular(0), // No rounding for bottom-right
    );
    canvas.drawRRect(rRect, _paint);
  }
}
class CustomTab extends StatelessWidget {
  final String text;
  final bool isSelected;

  const CustomTab({super.key, required this.text, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(
        text,
        style: GoogleFonts.poppins(
          color:  Colors.black, // Change text color based on selection
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class Bookingdata {
  final String amount;
  final String totalamout;
  final String id;
  final String mobilenumber;
  final String bookingtype;
  final String username;
  final String vehicleNumber;
  final String bookingDate;
  final String bookingTime;
  final String status;
  final String vehicletype;
  final String Cartype;
  final String parkingTime;
  final String parkingDate;
  final String Approvedate;
  final String Approvedtime;
  final String Amount;
  final String Hour;
  final String Vendorid;
  final String subscriptiontype;
  final String sts;
  final String parkeddate;
  final String parkedtime;
  final String invoiceid;
  final String? cancelledStatus;
  Duration payableDuration;
  final String exitvehicledate;
  final String exitvehicletime;
  final String bookType;
  final String otp;
  final String invoice;
  final String userid;
  final String vendorname;
  final String subscriptionenddate;
  Bookingdata(  {
    required this.totalamout,
    required this.amount,
    required this.invoiceid,
    required this.subscriptionenddate,
    required this.bookingtype,
    required this.username,
    required this.mobilenumber,
    required this.id,
    required this.vehicleNumber,
    required this.bookingDate,
    required this.bookingTime,
    required this.status,
    required this.vehicletype,
    required this.Cartype,
    required this.parkingTime,
    required this.parkingDate,
    required this.Amount,
    required this.Hour,
    required this.parkeddate,
    required this.parkedtime,
    required this.Vendorid,
    required this.subscriptiontype,
    required this.sts,
    required this.otp,
    this.cancelledStatus,
    required this.exitvehicledate,
    required this.exitvehicletime,
    required this.invoice,
    required this.Approvedate,
    required this.Approvedtime,
    required this.payableDuration,
    required this.bookType,
    required this.userid,
    required this.vendorname,
  });

  // Factory constructor to parse JSON
  factory Bookingdata.fromJson(Map<String, dynamic> json) {
    return Bookingdata(
      invoiceid: json['invoiceid']??"",
      amount: json['amount']??"",
      totalamout: json['totalamout']??"",
      invoice: json['invoice']??"",
      bookingtype:json['bookType']??"",
      vendorname:json['vendorName']??"",
      parkeddate:json['parkedDate']??"",
      parkedtime:json['parkedTime']??"",
      Approvedate:json['approvedDate']??"",
      Approvedtime:json['approvedTime']??"",
      username:json['personName']??"",
      mobilenumber:json['mobileNumber']??"",
      id:json['_id']??"",
      otp:json['otp']??"",
      Vendorid: json['vendorId'] ?? '',
      status: json['status'] ?? '',
      vehicletype: json['vehicleType'] ?? '',
      Cartype: json['carType'] ?? '',
      vehicleNumber: json['vehicleNumber'] ?? '',
      bookingDate: json['bookingDate'] ?? '',
      parkingTime: json['parkingTime'] ?? '',
      parkingDate:json['parkingDate'] ?? '',
      bookingTime: json['bookingTime'] ?? '',
      Amount: json['amount'] ?? '',
      Hour: json['hour'] ?? '',
      sts: json['sts'] ?? '',
      userid:json['userid']??"",
      subscriptiontype:json['subsctiptiontype']?? '',
      payableDuration: Duration.zero,
      bookType:json['bookType']??"",
      exitvehicledate : json['exitvehicledate'] ?? '',
      exitvehicletime   : json['exitvehicletime'] ?? '',
      subscriptionenddate:json['subsctiptionenddate']?? '',
      cancelledStatus: json['cancelledStatus'],
    );
  }

}
