import 'dart:convert';
import 'package:bottom_picker/bottom_picker.dart';
import 'package:bottom_picker/resources/arrays.dart' show BottomPickerTheme;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mywheels/auth/customer/parking/parking.dart';
import 'package:mywheels/auth/vendor/vendorcreatebooking.dart';
import 'package:mywheels/auth/vendor/vendordash.dart';
import 'package:syncfusion_flutter_datepicker/datepicker.dart';
import '../../../config/authconfig.dart';
import '../../../config/colorcode.dart';
import 'package:http/http.dart' as http;

import '../../customer/parking/parkindetails.dart';
class managebooking extends StatefulWidget {
  final String vendorid;
  const managebooking({super.key,
    required this.vendorid,
  });
  @override
  _managebookingScreenState createState() => _managebookingScreenState();
}
class _managebookingScreenState extends State<managebooking>with SingleTickerProviderStateMixin {
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  late TextEditingController _startDateController;
  late TextEditingController _endDateController;

  late TabController _tabController;

  int _currentSegment = 0;

  late List<Widget> _pages;

  void _selectDate(BuildContext context) async {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.white,
          content: SizedBox(
            width: 300,
            height: 300,
            child: SfDateRangePicker(
              backgroundColor: Colors.white,
              selectionColor: ColorUtils.primarycolor(),
              startRangeSelectionColor: ColorUtils.primarycolor(),
              endRangeSelectionColor: ColorUtils.primarycolor(),
              rangeSelectionColor:ColorUtils.primarycolor().withOpacity(0.3),
              todayHighlightColor: ColorUtils.primarycolor(),
              selectionMode: DateRangePickerSelectionMode.range,
              minDate: DateTime(2001, 1, 1),
              maxDate: DateTime(2099, 1, 1),

              headerStyle: const DateRangePickerHeaderStyle(
                backgroundColor: Colors.white,
                textStyle: TextStyle(color: Colors.black, fontSize: 18),
              ),

              monthViewSettings: const DateRangePickerMonthViewSettings(
                viewHeaderStyle: DateRangePickerViewHeaderStyle(
                  backgroundColor: Colors.white,
                  textStyle: TextStyle(color: Colors.black),
                ),
              ),
                monthCellStyle: DateRangePickerMonthCellStyle(
                  todayCellDecoration: BoxDecoration(
                    color: ColorUtils.primarycolor().withOpacity(0.9),
                    shape: BoxShape.circle,
                  ),
                disabledDatesDecoration: BoxDecoration(
                  color: Colors.grey[200],
                  shape: BoxShape.circle,
                ),
                textStyle: const TextStyle(color: Colors.black),
                todayTextStyle: const TextStyle(color: Colors.white),
              ),

                onSelectionChanged: (DateRangePickerSelectionChangedArgs args) {
                  if (args.value is PickerDateRange) {
                    setState(() {
                      _startDate = args.value.startDate;
                      _endDate = args.value.endDate ?? args.value.startDate;
                    });
                  }
                }
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _startDateController.text =
                      DateFormat('dd-MM-yyyy').format(_startDate);
                                  _endDateController.text =
                      DateFormat('dd-MM-yyyy').format(_endDate);
                                });
                Navigator.of(context).pop();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: ColorUtils.primarycolor(),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                elevation: 3,
                minimumSize: const Size(40, 35),
              ),
              child: const Text(
                "OK",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        );
      },
    );
  }


  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _currentSegment = _tabController.index; // Update current segment based on TabController index
      });
    });
    _startDateController = TextEditingController(
      text: DateFormat('dd-MM-yyyy').format(_startDate),
    );
    _endDateController = TextEditingController(
      text: DateFormat('dd-MM-yyyy').format(_endDate),
    );
  }

  final bool _isLoading = true;

  late List<Widget> _pagess;
  late final TabController _controller;
  int selectedTabIndex = 0;

  @override
  void dispose() {

    _tabController.dispose(); // Clean up the controller when not in use
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {

    return Scaffold(backgroundColor: Colors.white,

      appBar: AppBar(titleSpacing: 0,
        backgroundColor: ColorUtils.secondarycolor(),
        title:  Text(
          'Manage Bookings',
          style:   GoogleFonts.poppins(color: Colors.black,fontSize: 18),
        ),
        iconTheme: const IconThemeData(
          color: Colors.black, // Set the color of the back icon to white
        ),
actions: [
  IconButton(
    onPressed: () {
      _selectDate(context);

    },
    icon:  Icon(Icons. calendar_month_outlined, color: ColorUtils.primarycolor(),), // Set the icon here

  ),
  const SizedBox(width: 10,),
],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(6.0),
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFFF1F2F3),
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(10), // Rounded corners only at the top
                        topRight: Radius.circular(10),
                      ),
                      // border: Border.all(
                      //   color: ColorUtils.primarycolor(), // Red border color
                      //   width: 0.5,
                      // ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          height: 39,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: Radius.circular(10),
                              topRight: Radius.circular(10),
                            ),
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
                        const SizedBox(height: 10),
        
                        Align(
                          alignment: Alignment.centerRight, // Aligns the content to the right
                          child: Row(
                            mainAxisSize: MainAxisSize.min, // Ensures the row size is based on content
                            children: [
                              Container(
                                child: Text(
                                  " ${_startDateController.text}",
                                  style:   GoogleFonts.poppins(fontSize: 14, color: Colors.black),
                                ),
                              ),
                              const SizedBox(width: 5),
                              Container(
                                child:  Text(
                                  " to",
                                  style:   GoogleFonts.poppins(fontSize: 14, color: Colors.black),
                                ),
                              ),
                              const SizedBox(width: 5),
                              Container(
                                child: Text(
                                  " ${_endDateController.text}",
                                  style:   GoogleFonts.poppins(fontSize: 14, color: Colors.black),
                                ),
                              ),
                              const SizedBox(width: 10),
                            ],
                          ),
                        ),
                  // Container(child: Text("end date:"),),
        
        
                        Container(
                          color: const Color(0xFFF1F2F3),
                          child: SizedBox(
                            height: MediaQuery.of(context).size.height - kToolbarHeight - 39 - 10, // Adjust height
                            child: TabBarView(
                              controller: _tabController,
                              children: [
                                manageCarsTab(vendorid: widget.vendorid, startDate: _startDate, endDate: _endDate),
                                managebiketab(vendorid: widget.vendorid, startDate: _startDate, endDate: _endDate),
                                manageothers(vendorid: widget.vendorid, startDate: _startDate, endDate: _endDate),
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
        ),
      ),








    );
  }



}
class manageCarsTab extends StatefulWidget {

  final String vendorid;
  final DateTime startDate; // Add this line
  final DateTime endDate;
  const manageCarsTab({super.key,  required this.vendorid, required this.startDate, required this.endDate});
  @override
  _CarsTabState createState() => _CarsTabState();
}

class _CarsTabState extends State<manageCarsTab> with SingleTickerProviderStateMixin {



  bool isLoading = true;
  @override
  void initState() {
    super.initState();



    // Update tab change listener




    fetchBookingData().then((data) {

      isLoading = false;

    }).catchError((error) {
      print(' $error');
    });
  }



  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
    final response = await http.get(url);

    print('Resonse body: ${response.body}'); // Print the response for debugging

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

  @override


  @override
  Widget build(BuildContext context) {
    return Container(

      decoration: BoxDecoration(

        borderRadius: BorderRadius.circular(10),  // Circular border

      ),
      child:Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: FutureBuilder<List<Bookingdata>>(
                future: fetchBookingData(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return  Column(

                      children: [
                        const SizedBox(height: 50,),
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(40.0),
                            child: Image.asset('assets/gifload.gif',),
                          ),
                        )
                      ],
                    );
                  } else if (snapshot.hasError) {
                    return Center(child: Text('${snapshot.error}'));
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Column(

                      children: [
                        SizedBox(height: 100,),
                        Center(child: Text('No data available.')),
                      ],
                    );
                  } else {

                    final filteredData = snapshot.data!.where((booking) {
                      // Parse the booking date
                      List<String> parts = booking.bookingDate.split('-');
                      if (parts.length != 3) return false; // Skip invalid dates

                      int day = int.parse(parts[0]);
                      int month = int.parse(parts[1]);
                      int year = int.parse(parts[2]);
                      DateTime bookingDate = DateTime(year, month, day);

                      // Check if the booking date is within the selected range
                      bool isWithinDateRange = bookingDate.isAfter(widget.startDate.subtract(const Duration(days: 1))) && // Include start date
                          bookingDate.isBefore(widget.endDate.add(const Duration(days: 1))); // Include end date

                      // Check if the vendor ID matches
                      bool isMatchingVendor = booking.Vendorid == widget.vendorid;

                      // Check if the vehicle type matches
                      bool isVehicleTypeMatch = booking.vehicletype == 'Car'; // Adjust for vehicle type as needed

                      // Return true if all conditions are met
                      return isWithinDateRange && isMatchingVendor && isVehicleTypeMatch;
                    }).toList();
// Debugging: print final filtered data
                    print('Filtered Data: $filteredData');


                    // If no filtered data, show message
                    if (filteredData.isEmpty) {
                      return  const Column(

                        children: [
                          SizedBox(height: 100,),
                          Center(child: Text('No data available.')),
                        ],
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];

                          // Booking datetime
                          final String bookingCombine = '${vehicle.bookingDate} ${vehicle.bookingTime}';
                          DateTime? combineBook;
                          try {
                            combineBook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingCombine);
                          } catch (e) {
                            combineBook = null;
                          }
                          String bookcom = combineBook != null
                              ? DateFormat('d MMM, yyyy, hh:mm a').format(combineBook)
                              : 'N/A';

                          // Parking datetime
                          final String combinedDateTimeString = '${vehicle.parkingDate} ${vehicle.parkingTime}';
                          DateTime? combinedDateTime;
                          try {
                            combinedDateTime =
                                DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
                          } catch (e) {
                            combinedDateTime = null;
                          }
                          String formattedDateTime = combinedDateTime != null
                              ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
                              : 'N/A';

                          // For suffix formatted date (if needed anywhere)
                          DateTime parsedDate =
                          DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);

                          return InkWell(
                              onTap: () {
                                // Navigate to details page
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
                                      username: vehicle.username, amount: vehicle.amount, totalamount: vehicle.totalamout, invoice: vehicle.invoice,
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
                              },child: BookingCard(vehicle: vehicle,  onRefresh: () => setState(() {}),));
                        },
                      ),
                    );

                  }
                },
              ),
            ),
          ),



    );
  }



}


class managebiketab extends StatefulWidget {

  final String vendorid;
  final DateTime startDate; // Add this line
  final DateTime endDate;
  const managebiketab({super.key,  required this.vendorid, required this.startDate, required this.endDate});
  @override
  _managebikeState createState() => _managebikeState();
}

class _managebikeState extends State<managebiketab> with SingleTickerProviderStateMixin {

  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time


  bool isLoading = true;
  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();


    // Update tab change listener




    fetchBookingData().then((data) {

      isLoading = false;

    }).catchError((error) {
      print(' $error');
    });
  }



  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
    final response = await http.get(url);

    print('Resonse body: ${response.body}'); // Print the response for debugging

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

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(

      decoration: BoxDecoration(

        borderRadius: BorderRadius.circular(10),  // Circular border

      ),
      child:Center(
        child: Padding(
          padding: const EdgeInsets.only(top: 10.0),
          child: FutureBuilder<List<Bookingdata>>(
            future: fetchBookingData(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return  Column(

                  children: [
                    const SizedBox(height: 50,),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40.0),
                        child: Image.asset('assets/gifload.gif',),
                      ),
                    )
                  ],
                );
              } else if (snapshot.hasError) {
                return Center(child: Text(' ${snapshot.error}'));
              } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Column(

                  children: [
                    SizedBox(height: 100,),
                    Center(child: Text('No data available.')),
                  ],
                );
              } else {

                final filteredData = snapshot.data!.where((booking) {
                  // Parse the booking date
                  List<String> parts = booking.bookingDate.split('-');
                  if (parts.length != 3) return false; // Skip invalid dates

                  int day = int.parse(parts[0]);
                  int month = int.parse(parts[1]);
                  int year = int.parse(parts[2]);
                  DateTime bookingDate = DateTime(year, month, day);

                  // Check if the booking date is within the selected range
                  bool isWithinDateRange = bookingDate.isAfter(widget.startDate.subtract(const Duration(days: 1))) && // Include start date
                      bookingDate.isBefore(widget.endDate.add(const Duration(days: 1))); // Include end date

                  // Check if the vendor ID matches
                  bool isMatchingVendor = booking.Vendorid == widget.vendorid;

                  // Check if the vehicle type matches
                  bool isVehicleTypeMatch = booking.vehicletype == 'Bike'; // Adjust for vehicle type as needed

                  // Return true if all conditions are met
                  return isWithinDateRange && isMatchingVendor && isVehicleTypeMatch;
                }).toList();
// Debugging: print final filtered data
                print('Filtered Data: $filteredData');


                // If no filtered data, show message
                if (filteredData.isEmpty) {
                  return  const Column(

                    children: [
                      SizedBox(height: 100,),
                      Center(child: Text('No data available.')),
                    ],
                  );
                }

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                  child: ListView.builder(
                    itemCount: filteredData.length,
                    itemBuilder: (context, index) {
                      final vehicle = filteredData[index];
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

                      // Booking datetime
                      final String bookingCombine = '${vehicle.bookingDate} ${vehicle.bookingTime}';
                      DateTime? combineBook;
                      try {
                        combineBook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingCombine);
                      } catch (e) {
                        combineBook = null;
                      }
                      String bookcom = combineBook != null
                          ? DateFormat('d MMM, yyyy, hh:mm a').format(combineBook)
                          : 'N/A';

                      // Parking datetime
                      final String combinedDateTimeString = '${vehicle.parkingDate} ${vehicle.parkingTime}';
                      DateTime? combinedDateTime;
                      try {
                        combinedDateTime =
                            DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
                      } catch (e) {
                        combinedDateTime = null;
                      }
                      String formattedDateTime = combinedDateTime != null
                          ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
                          : 'N/A';

                      // For suffix formatted date (if needed anywhere)
                      DateTime parsedDate =
                      DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);
                      String formattedDate = formatWithSuffix(parsedDate);

                      return InkWell(
                          onTap: () {
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
                                  username: vehicle.username, amount: vehicle.amount, totalamount: vehicle.totalamout, invoice: vehicle.invoice,
                                  mobilenumber: vehicle.mobilenumber,
                                  sts: vehicle.sts,
                                  bookingtype: vehicle.bookingtype,
                                  otp: vehicle.otp,
                                  vehiclenumber: vehicle.vehicleNumber,
                                  vendorname: vehicle.vendorname,
                                  vendorid: vehicle.Vendorid,
                                  parkingdate: vehicle.parkingDate,
                                  parkingtime: vehicle.parkingTime,
                                  bookedid: vehicle.id,
                                  bookeddate: formattedDateTime, // ✅ formatted
                                  schedule: bookcom,              // ✅ formatted
                                  status: vehicle.status,
                                  vehicletype: vehicle.vehicletype,
                                ),
                              ),
                            );
                          },child: BookingCard(vehicle: vehicle,  onRefresh: () => setState(() {}),));
                    },
                  ),
                );
              }
            },
          ),
        ),
      ),



    );
  }



}

class manageothers extends StatefulWidget {

  final String vendorid;
  final DateTime startDate; // Add this line
  final DateTime endDate;
  const manageothers({super.key, required this.vendorid, required this.startDate, required this.endDate});
  @override
  _manageothersState createState() => _manageothersState();
}

class _manageothersState extends State<manageothers> with SingleTickerProviderStateMixin {

  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time


  bool isLoading = true;
  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();


    // Update tab change listener




    fetchBookingData().then((data) {

      isLoading = false;

    }).catchError((error) {
      print(' $error');
    });
  }



  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
    final response = await http.get(url);
    print('Resonse body: $url'); // Print the response for debugging

    print('Resonse body: ${response.body}'); // Print the response for debugging

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

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(

      decoration: BoxDecoration(

        borderRadius: BorderRadius.circular(10),  // Circular border

      ),
      child:Center(
        child: Padding(
          padding: const EdgeInsets.only(top: 10.0),
          child: FutureBuilder<List<Bookingdata>>(
            future: fetchBookingData(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return  Column(

                  children: [
                    const SizedBox(height: 50,),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40.0),
                        child: Image.asset('assets/gifload.gif',),
                      ),
                    )
                  ],
                );
              } else if (snapshot.hasError) {
                return Center(child: Text('${snapshot.error}'));
              } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Column(

                  children: [
                    SizedBox(height: 100,),
                    Center(child: Text('No data available.')),
                  ],
                );
              } else {

                final filteredData = snapshot.data!.where((booking) {
                  // Parse the booking date
                  List<String> parts = booking.bookingDate.split('-');
                  if (parts.length != 3) return false; // Skip invalid dates

                  int day = int.parse(parts[0]);
                  int month = int.parse(parts[1]);
                  int year = int.parse(parts[2]);
                  DateTime bookingDate = DateTime(year, month, day);

                  // Check if the booking date is within the selected range
                  bool isWithinDateRange = bookingDate.isAfter(widget.startDate.subtract(const Duration(days: 1))) && // Include start date
                      bookingDate.isBefore(widget.endDate.add(const Duration(days: 1))); // Include end date

                  // Check if the vendor ID matches
                  bool isMatchingVendor = booking.Vendorid == widget.vendorid;

                  // Check if the vehicle type matches
                  bool isVehicleTypeMatch = booking.vehicletype == 'Others'; // Adjust for vehicle type as needed

                  // Return true if all conditions are met
                  return isWithinDateRange && isMatchingVendor && isVehicleTypeMatch;
                }).toList();
// Debugging: print final filtered data
                print('Filtered Data: $filteredData');


                // If no filtered data, show message
                if (filteredData.isEmpty) {
                  return  const Column(

                    children: [
                      SizedBox(height: 100,),
                      Center(child: Text('No data available.')),
                    ],
                  );
                }

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                  child: ListView.builder(
                    itemCount: filteredData.length,
                    itemBuilder: (context, index) {
                      final vehicle = filteredData[index];
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

                      // Booking datetime
                      final String bookingCombine = '${vehicle.bookingDate} ${vehicle.bookingTime}';
                      DateTime? combineBook;
                      try {
                        combineBook = DateFormat('dd-MM-yyyy hh:mm a').parse(bookingCombine);
                      } catch (e) {
                        combineBook = null;
                      }
                      String bookcom = combineBook != null
                          ? DateFormat('d MMM, yyyy, hh:mm a').format(combineBook)
                          : 'N/A';

                      // Parking datetime
                      final String combinedDateTimeString = '${vehicle.parkingDate} ${vehicle.parkingTime}';
                      DateTime? combinedDateTime;
                      try {
                        combinedDateTime =
                            DateFormat('dd-MM-yyyy hh:mm a').parse(combinedDateTimeString);
                      } catch (e) {
                        combinedDateTime = null;
                      }
                      String formattedDateTime = combinedDateTime != null
                          ? DateFormat('d MMM, yyyy, hh:mm a').format(combinedDateTime)
                          : 'N/A';

                      // For suffix formatted date (if needed anywhere)
                      DateTime parsedDate =
                      DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);
                      String formattedDate = formatWithSuffix(parsedDate);

                      return InkWell(
                          onTap: () {
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
                                  username: vehicle.username, amount: vehicle.amount, totalamount: vehicle.totalamout, invoice: vehicle.invoice,
                                  mobilenumber: vehicle.mobilenumber,
                                  sts: vehicle.sts,
                                  bookingtype: vehicle.bookingtype,
                                  otp: vehicle.otp,
                                  vehiclenumber: vehicle.vehicleNumber,
                                  vendorname: vehicle.vendorname,
                                  vendorid: vehicle.Vendorid,
                                  parkingdate: vehicle.parkingDate,
                                  parkingtime: vehicle.parkingTime,
                                  bookedid: vehicle.id,
                                  bookeddate: formattedDateTime, // ✅ formatted
                                  schedule: bookcom,              // ✅ formatted
                                  status: vehicle.status,
                                  vehicletype: vehicle.vehicletype,
                                ),
                              ),
                            );
                          },child: BookingCard(vehicle: vehicle,  onRefresh: () => setState(() {}),));
                    },
                  ),
                );
              }
            },
          ),
        ),
      ),



    );
  }



}
class BookingCard extends StatefulWidget {
  final Bookingdata vehicle;
  final VoidCallback onRefresh;

  const BookingCard({
    super.key,
    required this.vehicle,
    required this.onRefresh,
  });

  @override
  State<BookingCard> createState() => _BookingCardState();
}

class _BookingCardState extends State<BookingCard> {
  DateTime? selectedDateTime;
  String _formatDateTime(DateTime dateTime) {
    return DateFormat("dd-MM-yyyy hh:mm a").format(dateTime);  // Full date + time with AM/PM
  }
  Color customTeal = ColorUtils.primarycolor();
  final TextEditingController dateController = TextEditingController();
  final TextEditingController timeController = TextEditingController();
  final TextEditingController checkout = TextEditingController();
  final TextEditingController reschedule = TextEditingController();
  final FocusNode _subscriptionFocusNode = FocusNode();
  bool _isLoading=false;
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
                  dateController.text = DateFormat("dd-MM-yyyy").format(dateTime); // Set date
                  timeController.text = DateFormat("hh:mm a").format(dateTime); // Set time
                  checkout.text = _formatDateTime(dateTime); // Set date and time in the text box
                  reschedule.text = _formatDateTime(dateTime); // Update the reschedule text controller
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
  Future<void> _reshedule() async {

    // Format the date and time
    String formattedDate = DateFormat("dd-MM-yyyy").format(selectedDateTime!);
    String formattedTime = DateFormat("hh:mm a").format(selectedDateTime!);
    DateTime now = DateTime.now();

    try {

      // Prepare the data to send
      var data = {
        'userid': widget.vehicle.userid,
        'bookingDate': DateFormat("dd-MM-yyyy").format(now),
        'parkingDate': formattedDate,
        'parkingTime': formattedTime,
        'bookingTime': DateFormat("hh:mm a").format(now),
        'status':"PENDING"

      };

      // Debugging: Print the data being sent
      print('Sending data to server: $data');

      setState(() {
        _isLoading = true;
      });

      var response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}updaterescheule/${widget.vehicle.id}'),
        body: jsonEncode(data),
        headers: {"Content-Type": "application/json"},
      );

      // Debugging: Print the response status and body
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Parking rescheduled successfully!')),
        );

      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to register parking: ${response.body}')),
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
    final bool isApproved = widget.vehicle.status == "Approved";
    return SizedBox(
      height: isApproved ? 120 : 120,
      child: Stack(
        children: [
          Positioned(
            left: 0,
            top: 30,
            right: 0,
            child: Container(
              height: isApproved ? 90 : 80,
              decoration: BoxDecoration(
                color: widget.vehicle.status == 'Cancelled'
                    ? Colors.red
                    : ColorUtils.primarycolor(),
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
                  ' ${widget.vehicle.parkingDate}, ${widget.vehicle.parkingTime}',
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
                          left: 14,
                          top: 2,
                          right: 0.0,
                          bottom: 0.0),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: widget.vehicle.status == 'Cancelled'
                                ? Colors.red
                                : ColorUtils.primarycolor(),
                            width: 0.5,
                          ),
                        ),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(5.0),
                          topRight: Radius.circular(5.0),
                        ),
                        color: widget.vehicle.status == 'Cancelled'
                            ? Colors.white
                            : Colors.white,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            widget.vehicle.vehicleNumber,
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              color: widget.vehicle.status == 'Cancelled'
                                  ? Colors.red
                                  : ColorUtils.primarycolor(),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          if (widget.vehicle.status == "Cancelled")
                            Padding(
                              padding: const EdgeInsets.only(right: 12.0),
                              child: Text(
                                " ${widget.vehicle.cancelledStatus}",
                                style: GoogleFonts.poppins(
                                    color: widget.vehicle.status == 'Cancelled'
                                        ? Colors.red
                                        : ColorUtils.primarycolor(),
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                          if (widget.vehicle.cancelledStatus?.isEmpty ?? true)
                            Padding(
                              padding: const EdgeInsets.only(right: 12.0),
                              child: Text(
                                " ${widget.vehicle.status}",
                                style: GoogleFonts.poppins(
                                  color: widget.vehicle.status == 'Cancelled'
                                      ? Colors.red
                                      : ColorUtils.primarycolor(),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          if (widget.vehicle.status == "Approved") ...[
                            SizedBox(
                              height: 35,
                              child: IconButton(
                                onPressed: () {
                                  showModalBottomSheet(
                                    context: context,
                                    shape: const RoundedRectangleBorder(
                                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                    ),
                                    builder: (BuildContext context) {
                                      return Padding(
                                        padding: const EdgeInsets.all(16.0),
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              "Reschedule Booking",
                                              style: GoogleFonts.poppins(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 10),
                                            CusTextField(
                                              labelColor: customTeal,
                                              selectedColor: customTeal,
                                              controller: reschedule,
                                              focusNode: _subscriptionFocusNode,
                                              keyboard: TextInputType.text,
                                              obscure: false,
                                              textInputAction: TextInputAction.done,
                                              inputFormatter: const [],
                                              label: 'Reschedule Parking Date & Time',
                                              hint: selectedDateTime != null
                                                  ? _formatDateTime(selectedDateTime!)
                                                  : (widget.vehicle.parkingDate.isNotEmpty && widget.vehicle.parkingTime.isNotEmpty)
                                                  ? '${widget.vehicle.parkingDate}, ${widget.vehicle.parkingTime}'
                                                  : 'Select Date & Time',
                                              prefixIcon: Padding(
                                                padding: const EdgeInsets.only(left: 10.0, right: 5),
                                                child: Icon(Icons.calendar_today, color: customTeal),
                                              ),
                                              readOnly: true,
                                              onTap: () async {
                                                _showDateTimePickerForSubscription();
                                              },
                                            ),
                                            const SizedBox(height: 20),
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.end,
                                              children: [
                                                // TextButton(
                                                //   onPressed: () {
                                                //     Navigator.pop(context);
                                                //   },
                                                //   child: Text(
                                                //     "No",
                                                //     style: GoogleFonts.poppins(color: Colors.grey[700]),
                                                //   ),
                                                // ),
                                                const SizedBox(width: 10),
                                                ElevatedButton(
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: ColorUtils.primarycolor(),
                                                    shape: RoundedRectangleBorder(
                                                      borderRadius: BorderRadius.circular(5),
                                                    ),
                                                  ),
                                                  onPressed: _isLoading
                                                      ? null
                                                      : () {
                                                    Navigator.pop(context);
                                                    widget.onRefresh();
                                                    _reshedule();
                                                  },
                                                  child: Text(
                                                    "Reschedule",
                                                    style: GoogleFonts.poppins(color: Colors.white),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  );
                                },
                                icon: const Icon(Icons.calendar_month_outlined),
                                iconSize: 19,
                                color: Colors.black,
                              ),
                            ),
                            SizedBox(
                              height: 30,
                              child: Center(
                                child: IconButton(
                                  onPressed: () {
                                    showModalBottomSheet(
                                      context: context,
                                      shape: const RoundedRectangleBorder(
                                        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                      ),
                                      builder: (BuildContext context) {
                                        return Padding(
                                          padding: const EdgeInsets.all(16.0),
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                "Cancel Booking",
                                                style: GoogleFonts.poppins(
                                                  fontSize: 18,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 10),
                                              Text(
                                                "Are you sure you want to cancel this booking?",
                                                style: GoogleFonts.poppins(fontSize: 14),
                                              ),
                                              const SizedBox(height: 20),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.end,
                                                children: [
                                                  TextButton(
                                                    onPressed: () {
                                                      Navigator.pop(context);
                                                    },
                                                    child: Text(
                                                      "No",
                                                      style: GoogleFonts.poppins(color: Colors.grey[700]),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 10),
                                                  ElevatedButton(
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: Colors.red,
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius: BorderRadius.circular(5),
                                                      ),
                                                    ),
                                                    onPressed: () async {
                                                      Navigator.pop(context);
                                                      await updateapprovecancel(widget.vehicle.id, 'Cancelled');
                                                      widget.onRefresh();
                                                    },
                                                    child: Text(
                                                      "Yes, Cancel",
                                                      style: GoogleFonts.poppins(color: Colors.white),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    );
                                  },
                                  icon: const Icon(Icons.cancel_outlined),
                                  iconSize: 19,
                                  color: Colors.black,
                                  padding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 0),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.only(
                              left: 12.0,
                              right: 15.0,
                              top: 6.0,
                              bottom: 6.0),
                          decoration: BoxDecoration(
                            color: widget.vehicle.status == 'Cancelled'
                                ? Colors.red
                                : ColorUtils.primarycolor(),
                            borderRadius: const BorderRadius.only(
                              topRight: Radius.circular(20.0),
                              bottomRight: Radius.circular(20.0),
                            ),
                          ),
                          child: Icon(
                            widget.vehicle.vehicletype == "Car"
                                ? Icons.drive_eta
                                : Icons.directions_bike,
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 0),
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
                                          ' ${widget.vehicle.parkingDate}',
                                          style: GoogleFonts.poppins(fontSize: 12),
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          widget.vehicle.parkingTime,
                                          style: GoogleFonts.poppins(fontSize: 12),
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
                                    style: GoogleFonts.poppins(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    widget.vehicle.sts == 'Schedule'
                                        ? 'Prescheduled'
                                        : widget.vehicle.sts == 'Instant'
                                        ? 'Drive-in'
                                        : widget.vehicle.sts,
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.start,
                                children: [
                                  Container(height: 10),
                                  if (widget.vehicle.status == "PARKED")
                                    Container(),
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
    );
  }

  Future<void> updateapprovecancel(String bookingId, String newStatus) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/approvedcancelbooking/$bookingId');

    try {
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'status': newStatus,
        }),
      );

      if (response.statusCode == 200) {
        final responseBody = jsonDecode(response.body);
        print('Booking updated successfully: ${responseBody['data']}');
      } else {
        print('Failed to update booking: ${response.statusCode} ${response.body}');
        try {
          final errorResponse = jsonDecode(response.body);
          throw Exception(errorResponse['message'] ?? 'Failed to update booking status');
        } catch (e) {
          throw Exception('Failed to update booking status: ${response.body}');
        }
      }
    } catch (error) {
      print('Error updating booking status: $error');
      rethrow;
    }
  }
}
