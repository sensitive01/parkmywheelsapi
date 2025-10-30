import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:mywheels/auth/vendor/paytimeamount.dart';
import 'package:mywheels/auth/vendor/subscription/vendorsubscriptonbooking.dart';
import 'package:mywheels/config/colorcode.dart';
import 'package:mywheels/pageloader.dart';
import '../../config/authconfig.dart';

class vSearchScreen extends StatefulWidget {
  final String vendorid;
  const vSearchScreen({super.key, required this.vendorid});

  @override
  _vSearchScreenState createState() => _vSearchScreenState();
}

class _vSearchScreenState extends State<vSearchScreen> {
  List<Map<String, dynamic>> filteredVendors = [];
  List<Map<String, dynamic>> allVendors = [];
  TextEditingController searchController = TextEditingController();
  bool isLoading = true;
  bool hasError = false;
  late Timer _payableTimer;

  @override
  void initState() {
    super.initState();
    print('initState: Fetching vendors for vendorid: ${widget.vendorid}');
    fetchVendors();
    _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        updatePayableTimes();
      }
    });
  }

  @override
  void dispose() {
    _payableTimer.cancel();
    searchController.dispose();
    super.dispose();
  }

  void updatePayableTimes() {
    if (!mounted) return;

    print('updatePayableTimes: Updating payable times for ${filteredVendors.length} vehicles');
    setState(() {
      filteredVendors = filteredVendors.map((vehicle) {
        if (vehicle['status'] == 'PARKED' || vehicle['status'] == 'parked') {
          try {
            final parkedDateTime = _parseDateTime(
              vehicle['parkedDate'] ?? vehicle['parkingDate'],
              vehicle['parkedTime'] ?? vehicle['parkingTime'],
            );
            final elapsed = DateTime.now().difference(parkedDateTime);
            vehicle['payableDuration'] = elapsed;
            print('updatePayableTimes: Vehicle ${vehicle['vehicleNumber']} duration: $elapsed');
          } catch (e) {
            print('updatePayableTimes: Error calculating payable time for ${vehicle['vehicleNumber']}: $e');
          }
        }
        return vehicle;
      }).toList();
    });
  }

  DateTime _parseDateTime(String dateStr, String timeStr) {
    print('parseDateTime: Parsing date: $dateStr, time: $timeStr');
    try {
      final dateParts = dateStr.split('-');
      final day = int.parse(dateParts[0]);
      final month = int.parse(dateParts[1]);
      final year = int.parse(dateParts[2]);

      final timeFormat = DateFormat('hh:mm a');
      final time = timeFormat.parse(timeStr);

      final parsedDateTime = DateTime(year, month, day, time.hour, time.minute, time.second);
      print('parseDateTime: Successfully parsed to $parsedDateTime');
      return parsedDateTime;
    } catch (e) {
      print('parseDateTime: Error parsing date/time: $dateStr $timeStr - $e');
      return DateTime.now();
    }
  }

  DateTime? _parseSubscriptionEndDate(String? endDateStr) {
    if (endDateStr == null || endDateStr.isEmpty) return null;
    try {
      final dateParts = endDateStr.split('-');
      final day = int.parse(dateParts[0]);
      final month = int.parse(dateParts[1]);
      final year = int.parse(dateParts[2]);
      return DateTime(year, month, day);
    } catch (e) {
      print('parseSubscriptionEndDate: Error parsing end date: $endDateStr - $e');
      return null;
    }
  }

  IconData _getVehicleIcon(String? vehicleType) {
    switch (vehicleType?.toLowerCase()) {
      case 'car':
        return Icons.directions_car;
      case 'bike':
        return Icons.two_wheeler;
      default:
        return Icons.directions_transit;
    }
  }

  Future<void> fetchVendors() async {
    try {
      setState(() {
        isLoading = true;
        hasError = false;
      });
      print('fetchVendors: Fetching data from API for vendorid: ${widget.vendorid}');
      final url = '${ApiConfig.baseUrl}vendor/getparkedbooking/${widget.vendorid}';
      final response = await http.get(Uri.parse(url));
      print('fetchVendors: API Response Status: ${response.statusCode}');
      print('fetchVendors: API Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.containsKey('bookings') && data['bookings'] is List) {
          final List<Map<String, dynamic>> vendorsList =
          List<Map<String, dynamic>>.from(data['bookings']);

          // Initialize default values for missing fields
          for (var vehicle in vendorsList) {
            vehicle['vehicleNumber'] ??= 'Unknown';
            vehicle['status'] ??= 'Unknown';
            vehicle['parkedDate'] ??= vehicle['parkingDate'] ?? DateFormat('dd-MM-yyyy').format(DateTime.now());
            vehicle['parkedTime'] ??= vehicle['parkingTime'] ?? DateFormat('hh:mm a').format(DateTime.now());
            vehicle['vehicleType'] ??= 'Unknown';
            vehicle['sts'] ??= 'Unknown';
// Add subscription end date field

            if (vehicle['status'].toString().toLowerCase() == 'parked' &&
                (vehicle['sts'].toString().toLowerCase() == 'instant' ||
                    vehicle['sts'].toString().toLowerCase() == 'schedule')) {
              try {
                final parkedDateTime = _parseDateTime(
                  vehicle['parkedDate'],
                  vehicle['parkedTime'],
                );
                vehicle['payableDuration'] = DateTime.now().difference(parkedDateTime);
              } catch (e) {
                print('fetchVendors: Error initializing payable time for ${vehicle['vehicleNumber']}: $e');
                vehicle['payableDuration'] = Duration.zero;
              }
            }
          }

          setState(() {
            allVendors = vendorsList;
            filteredVendors = vendorsList
                .where((v) => v['sts'] == 'Instant' || v['sts'] == 'Schedule' || v['sts'] == 'Subscription')
                .toList();
            isLoading = false;
          });
        } else {
          throw Exception('Invalid API response format.');
        }
      } else {
        throw Exception('Failed to load vendors: ${response.statusCode}');
      }
    } catch (e) {
      setState(() {
        isLoading = false;
        hasError = true;
      });
      print('fetchVendors: Exception: $e');
    }
  }

  void filterVendors(String query) {
    print('filterVendors: Filtering with query: $query');
    if (query.isEmpty) {
      setState(() {
        filteredVendors = allVendors
            .where((v) => v['sts'] == 'Instant' || v['sts'] == 'Schedule' || v['sts'] == 'Subscription')
            .toList();
        print('filterVendors: No query, filteredVendors Length: ${filteredVendors.length}');
      });
      return;
    }

    setState(() {
      filteredVendors = allVendors.where((v) {
        final vehicleNumber = v['vehicleNumber']?.toString().toLowerCase() ?? '';
        final matches = vehicleNumber.contains(query.toLowerCase()) &&
            (v['sts'] == 'Instant' || v['sts'] == 'Schedule' || v['sts'] == 'Subscription');
        print('filterVendors: Vehicle ${v['vehicleNumber']} matches: $matches');
        return matches;
      }).toList();
      print('filterVendors: Filtered with query, filteredVendors Length: ${filteredVendors.length}');
    });
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  String formatWithSuffix(DateTime date) {
    int day = date.day;
    String suffix = 'th';
    if (!(day >= 11 && day <= 13)) {
      switch (day % 10) {
        case 1:
          suffix = 'st';
          break;
        case 2:
          suffix = 'nd';
          break;
        case 3:
          suffix = 'rd';
          break;
      }
    }
    return '$day$suffix ${DateFormat('MMMM yyyy').format(date)}';
  }

  DateTime? _calculateSubscriptionEndDate(String dateStr, String timeStr) {
    try {
      final startDateTime = _parseDateTime(dateStr, timeStr);
      // Assume a 30-day subscription period
      final subscriptionEndDate = startDateTime.add(const Duration(days: 30));
      return subscriptionEndDate;
    } catch (e) {
      print('calculateSubscriptionEndDate: Error calculating end date: $e');
      return null;
    }
  }

  String getRemainingDaysMessage(String dateStr, String timeStr) {
    final endDate = _calculateSubscriptionEndDate(dateStr, timeStr);
    if (endDate == null) return 'N/A';
    final remainingDays = endDate.difference(DateTime.now()).inDays;
    if (remainingDays <= 0) {
      return 'Parking ends today!';
    }
    return '$remainingDays days left';
  }

  @override
  Widget build(BuildContext context) {
    print('build: isLoading: $isLoading, hasError: $hasError, filteredVendors Length: ${filteredVendors.length}');
    return isLoading
        ? const LoadingGif()
        : Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: ColorUtils.secondarycolor(),
        iconTheme: const IconThemeData(color: Colors.black),
        title: Text(
          'Search Parking Booking',
          style: GoogleFonts.poppins(color: Colors.black, fontSize: 18),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 7),
              child: TextFormField(
                controller: searchController,
                onChanged: filterVendors,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFFF1F2F3),
                  border: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: ColorUtils.primarycolor(),
                      width: 0.5,
                    ),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(5),
                    borderSide: BorderSide(
                      color: ColorUtils.primarycolor(),
                      width: 0.5,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(5),
                    borderSide: BorderSide(
                      color: ColorUtils.primarycolor(),
                      width: 0.5,
                    ),
                  ),
                  prefixIcon: GestureDetector(
                    onTap: () {
                      print('build: Search icon tapped, reloading vSearchScreen');
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                            builder: (context) => vSearchScreen(vendorid: widget.vendorid)),
                      );
                    },
                    child: Icon(
                      Icons.search,
                      color: ColorUtils.primarycolor(),
                    ),
                  ),
                  constraints: const BoxConstraints(
                    maxHeight: 40,
                    maxWidth: double.infinity,
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  hintText: 'Search',
                  hintStyle: GoogleFonts.poppins(
                    fontWeight: FontWeight.w300,
                    fontSize: 14,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: hasError
                  ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('No Parked Vehicles Found'),

                  ],
                ),
              )
                  : filteredVendors.isEmpty
                  ? const Center(child: Text('No Parked Vehicles Found'))
                  : ListView.builder(
                itemCount: filteredVendors.length,
                itemBuilder: (context, index) {
                  final vehicle = filteredVendors[index];
                  final payableDuration =
                      vehicle['payableDuration'] as Duration? ?? Duration.zero;
                  final formattedPayableDuration = _formatDuration(payableDuration);

                  final parkedDate = vehicle['parkedDate'] ?? vehicle['parkingDate'] ?? '';
                  final parkedTime = vehicle['parkedTime'] ?? vehicle['parkingTime'] ?? '';

                  DateTime parsedDate = DateTime.now();
                  if (parkedDate.isNotEmpty && parkedTime.isNotEmpty) {
                    try {
                      parsedDate = _parseDateTime(parkedDate, parkedTime);
                    } catch (e) {
                      print('build: Error parsing date for ${vehicle['vehicleNumber']}: $e');
                    }
                  }

                  final isSubscription =
                      vehicle['sts'].toString().toLowerCase() == 'subscription';
                  final remainingDaysMessage =
                  isSubscription ? getRemainingDaysMessage(parkedDate, parkedTime) : '';
                  return GestureDetector(
                    onTap: () {
                      print('build: Vehicle ${vehicle['vehicleNumber']} tapped');
                      // Add navigation logic if needed
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
                                color: ColorUtils.primarycolor(),
                                borderRadius: const BorderRadius.only(
                                  bottomLeft: Radius.circular(30),
                                  bottomRight: Radius.circular(30),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    spreadRadius: 1,
                                    blurRadius: 2,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              alignment: Alignment.bottomCenter,
                              child: Padding(
                                padding: const EdgeInsets.all(5.0),
                                child: Text(
                                  ' ${formatWithSuffix(parsedDate)}, $parkedTime',
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
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      spreadRadius: 1,
                                      blurRadius: 2,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.only(
                                          left: 14, top: 2, right: 0.0, bottom: 0.0),
                                      decoration: BoxDecoration(
                                        border: Border(
                                          bottom: BorderSide(
                                            color: ColorUtils.primarycolor(),
                                            width: 0.5,
                                          ),
                                        ),
                                        borderRadius: const BorderRadius.only(
                                          topLeft: Radius.circular(5.0),
                                          topRight: Radius.circular(5.0),
                                        ),
                                        color: Colors.white,
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            vehicle['vehicleNumber'] ?? 'Unknown',
                                            style: GoogleFonts.poppins(
                                              fontSize: 16,
                                              color: ColorUtils.primarycolor(),
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const Spacer(),
                                          if (vehicle['sts'].toString().toLowerCase() == 'instant' ||
                                              vehicle['sts'].toString().toLowerCase() == 'schedule')
                                            Padding(
                                              padding: const EdgeInsets.only(bottom: 5.0),
                                              child: SizedBox(
                                                height: 25,
                                                child: Padding(
                                                  padding: const EdgeInsets.only(right: 8.0),
                                                  child: ElevatedButton(
                                                    onPressed: () {
                                                      print(
                                                          'build: Exit button pressed for ${vehicle['vehicleNumber']}');
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
                                                                  borderRadius:
                                                                  BorderRadius.vertical(top: Radius.circular(20)),
                                                                ),
                                                                child: Exitpage(
                                                                  currentTabIndex: 0,
                                                                  userid: vehicle['userid'] ?? '',
                                                                  otp: vehicle['otp'] ?? '',
                                                                  vehicletype: vehicle['vehicleType'] ?? '',
                                                                  bookingid: vehicle['_id'] ?? '',
                                                                  parkingdate: vehicle['parkingDate'] ?? '',
                                                                  vehiclenumber: vehicle['vehicleNumber'] ?? '',
                                                                  username: vehicle['personName'] ?? '',
                                                                  phoneno: vehicle['mobileNumber'] ?? '',
                                                                  parkingtime: vehicle['parkingTime'] ?? '',
                                                                  bookingtypetemporary: vehicle['status'] ?? '',
                                                                  sts: vehicle['sts'] ?? '',
                                                                  cartype: vehicle['carType'] ?? '',
                                                                  vendorid: vehicle['vendorId'] ?? '',
                                                                  bookType: vehicle['bookType'] ?? '',
                                                                ),
                                                              );
                                                            },
                                                          );
                                                        },
                                                      );
                                                    },
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: Colors.white,
                                                      foregroundColor: Colors.red,
                                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                                      minimumSize: const Size(0, 0),
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius: const BorderRadius.all(Radius.circular(5)),
                                                        side: BorderSide(
                                                          color: ColorUtils.primarycolor(),
                                                          width: 0.5,
                                                        ),
                                                      ),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(
                                                          Icons.qr_code_scanner,
                                                          color: ColorUtils.primarycolor(),
                                                          size: 14,
                                                        ),
                                                        const SizedBox(width: 5),
                                                        Text(
                                                          'Exit',
                                                          style: GoogleFonts.poppins(
                                                            fontSize: 10,
                                                            fontWeight: FontWeight.bold,
                                                            color: ColorUtils.primarycolor(),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          if (vehicle['sts'].toString().toLowerCase() == 'subscription')

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
                                                                child: subexit(
                                                                  userid: vehicle['userid'] ?? '',
                                                                  otp: vehicle['otp'] ?? '',
                                                                  vehicletype: vehicle['vehicleType'] ?? '',
                                                                  bookingid: vehicle['_id'] ?? '',
                                                                  parkingdate: vehicle['parkingDate'] ?? '',
                                                                  vehiclenumber: vehicle['vehicleNumber'] ?? '',
                                                                  username: vehicle['personName'] ?? '',
                                                                  phoneno: vehicle['mobileNumber'] ?? '',
                                                                  parkingtime: vehicle['parkingTime'] ?? '',
                                                                  bookingtypetemporary: vehicle['status'] ?? '',
                                                                  sts: vehicle['sts'] ?? '',
                                                                  cartype: vehicle['carType'] ?? '',
                                                                  vendorid: vehicle['vendorId'] ?? '',

                                                                  parkeddate: vehicle['parkedDate'] ?? '',
                                                                  parkedtime:vehicle['parkedTime'] ?? '',
                                                                  status: vehicle['status'] ?? '',
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
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.only(
                                              left: 12.0, right: 15.0, top: 6.0, bottom: 6.0),
                                          decoration: BoxDecoration(
                                            color: vehicle['status'].toString().toLowerCase() == 'cancelled'
                                                ? Colors.red
                                                : ColorUtils.primarycolor(),
                                            borderRadius: const BorderRadius.only(
                                              topRight: Radius.circular(20.0),
                                              bottomRight: Radius.circular(20.0),
                                            ),
                                          ),
                                          child: Icon(
                                            _getVehicleIcon(vehicle['vehicleType']),
                                            size: 20,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  const SizedBox(height: 10),
                                                  Padding(
                                                    padding: const EdgeInsets.only(top: 8.0),
                                                    child: Row(
                                                      children: [
                                                        Text(
                                                          'Parking Schedule: ',
                                                          style: GoogleFonts.poppins(
                                                            fontSize: 12,
                                                            fontWeight: FontWeight.bold,
                                                          ),
                                                        ),
                                                        Text(
                                                          ' ${vehicle['parkingDate'] ?? 'N/A'}',
                                                          style: GoogleFonts.poppins(fontSize: 12),
                                                        ),
                                                        const SizedBox(width: 5),
                                                        Text(
                                                          vehicle['parkingTime'] ?? 'N/A',
                                                          style: GoogleFonts.poppins(fontSize: 12),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              if (vehicle['sts'].toString().toLowerCase() == 'instant' ||
                                                  vehicle['sts'].toString().toLowerCase() == 'schedule')
                                                Row(
                                                  children: [
                                                    Text(
                                                      'Payable Time: ',
                                                      style: GoogleFonts.poppins(
                                                        fontSize: 14,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                    Text(
                                                      formattedPayableDuration,
                                                      style: GoogleFonts.poppins(fontSize: 14),
                                                    ),
                                                  ],
                                                ),
                                              if (vehicle['sts'].toString().toLowerCase() == 'subscription')
                                                Row(
                                                  children: [
                                                    Text(
                                                      'Remaining: ',
                                                      style: GoogleFonts.poppins(
                                                        fontSize: 14,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                    Text(
                                                      remainingDaysMessage,
                                                      style: GoogleFonts.poppins(
                                                        fontSize: 14,
                                                        color: ColorUtils.primarycolor(),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.start,
                                                children: [
                                                  Container(height: 10),
                                                  if (vehicle['status'].toString().toLowerCase() == 'parked')
                                                    Container(
                                                      alignment: Alignment.topCenter,
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
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}