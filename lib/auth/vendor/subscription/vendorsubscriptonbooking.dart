import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lottie/lottie.dart';
import 'package:mywheels/auth/customer/parking/parkindetails.dart';
import 'package:mywheels/auth/vendor/vendordash.dart';
import 'package:mywheels/pageloader.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:tab_container/tab_container.dart';
import '../../../config/authconfig.dart';
import '../../../config/colorcode.dart';

import 'package:http/http.dart'as http;

import '../bookings.dart';
import '../vendorcreatebooking.dart';
import '../vendorsearch.dart';
import 'addsubscribe.dart';




class UserPaymentVerificationPage extends StatefulWidget {
  final String paymentId;
  final String orderId;
  final String totalAmount;
  final String userid;
  final String vendorname;
  final String vendorid;
  final String amount;
  final String payableduration;
  final String? bookingid;
  final String? newEndDate;
  final String gstfee;
  final String handlingfee;
  final VoidCallback onPaymentVerified;

  const UserPaymentVerificationPage({
    super.key,
    required this.paymentId,
    required this.orderId,
    required this.totalAmount,
    required this.userid,
    required this.vendorname,
    required this.vendorid,
    required this.amount,
    required this.payableduration,
    this.bookingid,
    this.newEndDate,
    required this.gstfee,
    required this.handlingfee,
    required this.onPaymentVerified,
  });

  @override
  _UserPaymentVerificationPageState createState() => _UserPaymentVerificationPageState();
}

class _UserPaymentVerificationPageState extends State<UserPaymentVerificationPage> {
  bool _isVerifying = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Verification'),
        backgroundColor: ColorUtils.primarycolor(),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Payment Details',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildDetailRow('Payment ID', widget.paymentId),
                    _buildDetailRow('Order ID', widget.orderId),
                    _buildDetailRow('Total Amount', '₹${widget.totalAmount}'),
                    _buildDetailRow('User ID', widget.userid),
                    _buildDetailRow('Vendor', widget.vendorname),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Please verify the payment details and confirm to proceed with subscription renewal.',
              style: TextStyle(fontSize: 16),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isVerifying ? null : _verifyPayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: ColorUtils.primarycolor(),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isVerifying
                    ? const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                    SizedBox(width: 8),
                    Text('Verifying...'),
                  ],
                )
                    : const Text('Verify Payment & Update Subscription'),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: _isVerifying ? null : () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  void _verifyPayment() async {
    setState(() {
      _isVerifying = true;
    });

    try {
      // Simulate verification process
      await Future.delayed(const Duration(seconds: 2));

      // Show success message
      Fluttertoast.showToast(
        msg: "Payment verified successfully!",
        toastLength: Toast.LENGTH_SHORT,
      );

      // Call the callback to process payment and update subscription
      widget.onPaymentVerified();

      // Navigate back
      Navigator.pop(context);

    } catch (e) {
      Fluttertoast.showToast(
        msg: "Verification failed: ${e.toString()}",
        toastLength: Toast.LENGTH_SHORT,
      );
    } finally {
      setState(() {
        _isVerifying = false;
      });
    }
  }
}

class viewsubscriptionamout extends StatefulWidget {
  final String vendorid;
  const viewsubscriptionamout({super.key,
    required this.vendorid,
  });
  @override
  _viewsubscriptionamoutState createState() => _viewsubscriptionamoutState();
}

  class _viewsubscriptionamoutState extends State<viewsubscriptionamout>with SingleTickerProviderStateMixin {

  bool isLoading = true;
  bool showSubscriptionBookings = true; // Control to show subscription bookings or temporary bookings
  late final TabController _controller;
  int selectedTabIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final DateTime _selectedDate = DateTime.now(); // Initialize with today's date
  final TextEditingController _dateController = TextEditingController();
  List<Bookingdata> bookingData = [];

  @override
  void initState() {
    super.initState();

    _controller = TabController(vsync: this, length: 2); // Change this to 2
    _controller.addListener(() {
      setState(() {
        selectedTabIndex = _controller.index;
      });
    });
    _loadData();
    fetchBookingData().then((data) {
      setState(() {
        // bookingDataNotifier.value = data;
      });
      _dateController.text = DateFormat('dd-MM-yyyy').format(_selectedDate);
    });
    fetchBookingData();
  }
  Future<void> _loadData() async {
    try {
      final data = await fetchBookingData();
      setState(() {
        bookingData = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    }
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
      throw 'No bookings found'; // Plain message for these errors
    } else {
      // Handle other status codes with a clear response
      throw response.body; // No "Error:" prefix here, just the API response
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


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: ColorUtils.secondarycolor(),
        title:  Text(
          'Subscriptions ',
          style:   GoogleFonts.poppins(color: Colors.black,fontSize: 14),
        ),
        iconTheme: const IconThemeData(
          color: Colors.black,
        ),
        actions: [

              PopupMenuButton<String>(
                icon: Icon(Icons.arrow_drop_down, size: 21, color: ColorUtils.primarycolor()),
                onSelected: (String value) {
                  if (value == 'Booking') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => Bookings(vendorid: widget.vendorid),
                      ),
                    );
                  } else if (value == 'Subscription') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => viewsubscriptionamout(vendorid: widget.vendorid),
                      ),
                    );
                  }
                },
                itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                  const PopupMenuItem<String>(
                    value: 'Booking',
                    child: Text('Booking'),
                  ),
                  const PopupMenuItem<String>(
                    value: 'Subscription',
                    child: Text('Subscription'),
                  ),
                ],
              ),

              // Implement filter action


          IconButton(
            icon: Icon(Icons.settings,size: 20, color: ColorUtils.primarycolor()),
            onPressed: () {
              // Implement filter action
            },
          ),
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      vSearchScreen(vendorid: widget.vendorid),
                ),
              );
            },
            child: SvgPicture.asset(
              'assets/search.svg',
              color: ColorUtils.primarycolor(),
              height: 14,
            ),
          ),

          IconButton(
            icon: Icon(Icons.filter_list,size: 24, color: ColorUtils.primarycolor()),
            onPressed: () {
              // Implement filter action
            },
          ),
          GestureDetector(
            onTap: () async {
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
                    builder: (context) => viewplan(vendorid: widget.vendorid),
                  ),
                );
              }
            },
            child: Image.asset(
              'assets/addicon.png',
              height: 24,
            ),
          ),
          const SizedBox(width: 15),
        ],
      ),
    body: CarsTab(selectedDate: _selectedDate, vendorid: widget.vendorid),

    // Provide content for the "On Parking" tab




// Example content


    // Show subscription or temporary bookings based on condition
    );
  }



  String formatDuration(Duration duration) {
  final hours = duration.inHours.toString().padLeft(2, '0'); // Ensure two digits
  final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0'); // Ensure two digits
  final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0'); // Ensure two digits

  return '$hours.$minutes.$seconds'; // Format as HH.MM.SS
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



class CarsTab extends StatefulWidget {
  final DateTime selectedDate;
  final String vendorid;
  const CarsTab({super.key, required this.selectedDate, required this.vendorid});
  @override
  _CarsTabState createState() => _CarsTabState();
}

class _CarsTabState extends State<CarsTab> with SingleTickerProviderStateMixin {
  late final TabController _controller;
  int selectedTabIndex = 0;
  DateTime selectedDateTime = DateTime.now();  // Initialize with the current date and time
  // late final Timer _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);

  @override
  void initState() {
    super.initState();
    selectedDateTime = DateTime.now();
    _controller = TabController(vsync: this, length: 2);

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
          "${booking.bookingDate} ${booking.bookingTime}",
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
  Future<void> _refreshData() async {
    try {
      final data = await fetchBookingData();
      bookingDataNotifier.value = data;
      updatePayableTimes(); // Update the times after refresh
    } catch (e) {
      print('Error refreshing data: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error refreshing data: $e')),
        );
      }
    }
  }
  @override
  void dispose() {
    // _timer.cancel();
    bookingDataNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(

      decoration: BoxDecoration(
        color: ColorUtils.primarycolor(),
        borderRadius: BorderRadius.circular(10),  // Circular border
        border: Border.all(
          color: ColorUtils.primarycolor(),  // Border color, change as needed
          width: 0,           // Border width, adjust as needed
        ),
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
        selectedTextStyle:   GoogleFonts.poppins(
          fontSize: 15.0,
          color: ColorUtils.primarycolor(),
        ),
        unselectedTextStyle:   GoogleFonts.poppins(
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
                    return  const Center(

                      child: Text("No Bookings Found"),
                    );

                  }

                  // Filter the data
                  final filteredData = bookingData.where((booking) {
                    try {

                      return
                        booking.Vendorid == widget.vendorid &&
                            (booking.status == 'Booked' || booking.status == 'PARKED'|| booking.status == 'Parked') &&
                            (booking.sts == 'Subscription' ) &&
                            (booking.vehicletype == 'Car' || booking.vehicletype == 'Bike'|| booking.vehicletype == 'Others');

                    } catch (e) {
                      return false; // Skip invalid entries
                    }
                  }).toList();

                  if (filteredData.isEmpty) {
                    // Show "No data available" if filtering results in an empty list
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No subcription vehicles Parked'),
                      ],
                    );
                  }

                  // Show the filtered data in a ListView
                  return RefreshIndicator(
                    onRefresh: () async {
                      // Call the method to fetch data again
                      await _refreshData(); // Create this method
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];

                          return vendorsubleft(vehicle: vehicle,  onRefresh: _refreshData);

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
                        Text('No subcription vehicles found'),
                      ],
                    );
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Column(
                      children: [
                        SizedBox(height: 150),
                        Text('No subcription vehicles found'),
                      ],
                    );
                  } else {

                    final filteredData = snapshot.data!.where((booking) {
                      // Vendor ID match
                      bool isMatchingVendor = booking.Vendorid == widget.vendorid;

                      // Vehicle type must be Car, Bike, or Others
                      bool isValidType = ['Car', 'Bike', 'Others'].contains(booking.vehicletype);
                      bool isSubscription = booking.sts.toLowerCase() == 'subscription';

                      // Status match
                      bool isCompleted = booking.status.toUpperCase() == 'COMPLETED';

                      // Compare exit date to today
                      DateTime now = DateTime.now();
                      DateTime today = DateTime(now.year, now.month, now.day);

                      // Null or empty check
                      if (booking.exitvehicledate == null || booking.exitvehicledate!.isEmpty) return false;

                      List<String> exitParts = booking.exitvehicledate!.split('-');
                      if (exitParts.length != 3) return false;

                      DateTime exitDate = DateTime(
                        int.parse(exitParts[2]), // year
                        int.parse(exitParts[1]), // month
                        int.parse(exitParts[0]), // day
                      );

                      // Compare only date part
                      bool isSameDay = exitDate.year == today.year &&
                          exitDate.month == today.month &&
                          exitDate.day == today.day;

                      return isMatchingVendor && isValidType && isSubscription && isCompleted && isSameDay;
                    }).toList();

// Debugging: print final filtered data
                    print('Filtered Data based on exitDate: $filteredData');

// Debugging: print final filtered data
                    print('Filtered Data: $filteredData');


                    // If no filtered data, show message
                    if (filteredData.isEmpty) {
                      return const Column(
                        children: [
                          SizedBox(height: 150),
                          Text('No subcription vehicles found'),
                        ],
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 5.0),
                      child: ListView.builder(
                        itemCount: filteredData.length,
                        itemBuilder: (context, index) {
                          final vehicle = filteredData[index];
                          return vendsubright(vehicle: vehicle);
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
          Icon(
            Icons.local_parking,
            color: selectedTabIndex == 0 ? Colors.black : Colors.white,
          ),
          const SizedBox(width: 8),
          Text(
            'On Parking',
            style:   GoogleFonts.poppins(
              color: selectedTabIndex == 0 ? Colors.black : Colors.white,
            ),
          ),
        ],
      ),
      // Vendor Tab
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.verified_outlined,
            color: selectedTabIndex == 1 ? Colors.black : Colors.white,
          ),
          const SizedBox(width: 8),
          Text(
            'Completed',
            style:   GoogleFonts.poppins(
              color: selectedTabIndex == 1 ? Colors.black : Colors.white,
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
class vendorsubleft extends StatelessWidget {
  final Bookingdata vehicle; // Expecting Bookingdata type
  final VoidCallback? onRefresh; // Added callback for refreshing the parent list
  const vendorsubleft({super.key, required this.vehicle, this.onRefresh});

  @override
  Widget build(BuildContext context) {

    DateTime? subscriptionStartDate;
    DateTime? subscriptionEndDate;

    try {
      // Parse start date (only date part)
      subscriptionStartDate = DateFormat('dd-MM-yyyy').parse(vehicle.parkingDate);

      // Extract only the date part from end date (ignore time)
      String endDateStr = vehicle.subscriptionenddate.split(' ')[0];
      subscriptionEndDate = DateFormat('dd-MM-yyyy').parse(endDateStr);
    } catch (e) {
      print('Error parsing subscription dates: $e');
      subscriptionStartDate = null;
      subscriptionEndDate = null;
    }

// Initialize message
    String remainingDaysMessage = 'N/A';

    if (subscriptionStartDate != null && subscriptionEndDate != null) {
      DateTime today = DateTime.now();
      DateTime todayOnly = DateTime(today.year, today.month, today.day);
      DateTime startOnly = DateTime(subscriptionStartDate.year, subscriptionStartDate.month, subscriptionStartDate.day);
      DateTime endOnly = DateTime(subscriptionEndDate.year, subscriptionEndDate.month, subscriptionEndDate.day);

      if (todayOnly.isAfter(endOnly)) {
        // Expired
        remainingDaysMessage = "Subscription expired";
      } else {
        // Effective start for calculation
        DateTime effectiveStart = todayOnly.isBefore(startOnly) ? startOnly : todayOnly;

        // Base remaining days (end - effective_start).inDays
        int baseRemaining = endOnly.difference(effectiveStart).inDays;

        // Adjust: subtract 1 if subscription has started (exclude current day from "left")
        int remainingDays = (todayOnly.isBefore(startOnly)) ? baseRemaining : (baseRemaining - 1);

        if (endOnly.difference(todayOnly).inDays == 0) {
          remainingDaysMessage = "Subscription ends today!";
        } else if (remainingDays > 0) {
          if (remainingDays == 1) {
            remainingDaysMessage = "1 day left";
          } else {
            remainingDaysMessage = "$remainingDays days left";
          }
        } else {
          // Fallback for edge cases
          remainingDaysMessage = "Subscription ends today!";
        }
      }

      print('Debug Info:');
      print('Today: $todayOnly');
      print('Start Date: $startOnly');
      print('End Date: $endOnly');
      print('Message: $remainingDaysMessage');
    }
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
      onTap: (){
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
              mobilenumber: vehicle.mobilenumber,
              sts:vehicle.sts,
              bookingtype: vehicle.bookingtype,
              vehiclenumber: vehicle.vehicleNumber,
              vendorname: vehicle.vendorname,
              vendorid: vehicle.Vendorid,
              parkingdate: vehicle.parkingDate,
              parkingtime: vehicle.parkingTime,
              bookedid: vehicle.id,
              bookeddate: formattedDateTime,
              schedule: bookcom,
              otp:vehicle.otp,
              status: vehicle.status,
              vehicletype: vehicle.vehicletype, username: vehicle.username, amount: vehicle.amount, totalamount: vehicle.totalamout, invoice: vehicle.invoice,
            ),
          ),
        );
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


                            if (vehicle.status == "PARKED")
                              Padding(
                                padding: const EdgeInsets.only(right: 8.0, bottom: 5.0),
                                child: SizedBox(
                                  height: 25,
                                  child: ElevatedButton(
    onPressed: () async {
    final result = await showModalBottomSheet<bool>(
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
    child: RenewParkingSheet(
                                                  daysleft:remainingDaysMessage,
      navi: "",
      onRefresh: onRefresh,
    userid: vehicle.userid,
    otp: vehicle.otp,
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
    parkeddate: vehicle.parkeddate,
    parkedtime: vehicle.parkedtime,
    status: vehicle.status,
                                                  totalamount: vehicle.totalamout,
                                                  newEndDate: null,
                                                  gstfee: "0",
                                                  handlingfee: "0",
                                                  amout: vehicle.amount,
                                                  payableduration: "0",
                                                  venodorname: "Vendor",

                                                  subscriptionEndDate: vehicle.subscriptionenddate,
    ),
    );
    },
    );
    },
    );
    if (result == true && onRefresh != null) {
     onRefresh!();
    }
    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      foregroundColor: ColorUtils.primarycolor(),
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
                                          Icons.autorenew,
                                          color: ColorUtils.primarycolor(),
                                          size: 14,
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          'Renew',
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
                                                    userid:vehicle.userid,
                                                    otp: vehicle.otp,
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
                                                    parkeddate:vehicle.parkeddate,
                                                    parkedtime:vehicle.parkedtime,
                                                    status: vehicle.status,
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
                                                .exit_to_app,
                                            color: ColorUtils.primarycolor(), // Icon color
                                            size: 14,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            'complete',
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
                                  ? Icons
                                  .drive_eta // Car icon
                                  : Icons
                                  .directions_bike, // Bike icon
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
                                      'Remaining :',
                                      style: GoogleFonts
                                          .poppins(
                                          fontSize: 14,
                                          fontWeight:
                                          FontWeight
                                              .bold),
                                    ),

                                    Text(
                                      remainingDaysMessage,
                                      style: GoogleFonts.poppins(color: ColorUtils.primarycolor()),
                                    ),
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
class vendsubright extends StatelessWidget {

  final Bookingdata vehicle; // Expecting Bookingdata type
  const vendsubright({super.key, required this.vehicle});

  @override
  Widget build(BuildContext context) {

    return SizedBox(
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
                  ' ${vehicle.parkingDate}, ${vehicle.parkingTime}',
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
                                                userid:vehicle.userid,
                                                otp: vehicle.otp,
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
                                                parkeddate:vehicle.parkeddate,
                                                parkedtime:vehicle.parkedtime,
                                                status: vehicle.status,

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
                                ? Icons
                                .drive_eta // Car icon
                                : Icons
                                .directions_bike, // Bike icon
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
    );




  }
}


class RenewParkingSheet extends StatefulWidget {
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
  final String parkeddate;
  final String parkedtime;
  final String status;
  final String otp;
  final String userid;
  final String navi;
  final String totalamount;
  final String? newEndDate;
  final String gstfee;
  final String handlingfee;
  final String amout;
  final String payableduration;
  final String venodorname;
  final String daysleft;
  final String subscriptionEndDate;

  final VoidCallback? onRefresh;
  const RenewParkingSheet({
    super.key,
    this.onRefresh,
    required this.userid,
    required this.bookingid,
    required this.vehicletype,
    required this.vehiclenumber,
    required this.username,
    required this.phoneno,
    required this.parkingtime,
    required this.navi,
    required this.bookingtypetemporary,
    required this.sts,
    required this.cartype,
    required this.vendorid,
    required this.parkingdate,
    required this.parkeddate,
    required this.parkedtime,
    required this.status,
    required this.otp,
    required this.totalamount,
    this.newEndDate,
    required this.gstfee,
    required this.handlingfee,
    required this.amout,
    required this.payableduration,
    required this.venodorname, 
    required this.daysleft,
    required this.subscriptionEndDate,
  });

  @override
  State<RenewParkingSheet> createState() => _RenewParkingSheetState();
}

class _RenewParkingSheetState extends State<RenewParkingSheet> {
  late final Timer _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);
  DateTime? parkingEndDate;
  String remainingDaysMessage = '';
  double payableAmount = 0.0;
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  Razorpay? _razorpay;
  bool isLoading = true;
  List<Exitcharge> parkingCharges = [];
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double roundedAmount = 0.0;
  double decimalDifference = 0.0;
  double totalAmountWithTaxes = 0.0;
  bool isOtpEntered = false;

  // Month selection variables
  int selectedMonths = 1;
  ValueNotifier<int> monthsNotifier = ValueNotifier(1);

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, handlePaymentSuccessResponse);
    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, handlePaymentErrorResponse);
    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, handleExternalWallet);
    // Initialize timer to update payable duration
    _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        updatePayableTimes();
      }
    });

    fetchGstData().then((gstData) {
      if (mounted) {
        setState(() {
          gstPercentage = double.tryParse(gstData['gst'] ?? '0') ?? 0.0;
          handlingFee = double.tryParse(gstData['handlingfee'] ?? '0') ?? 0.0;
        });
      }
    }).then((_) {
      // Then fetch other data
      _initializeData();
    });
  }

  void _initializeData() {
    // Calculate parking end date and remaining days
    parkingEndDate =
        calculateParkingEndDate(widget.parkeddate, widget.parkedtime);
    updateRemainingDays();

    // Calculate initial months based on remaining time
    if (parkingEndDate != null) {
      final remainingDays = parkingEndDate!.difference(DateTime.now()).inDays;
      selectedMonths = (remainingDays / 30).ceil().clamp(1, 12);
      monthsNotifier.value = selectedMonths;
    }

    // Fetch Parking Charges and Bookings Data
    fetchParkingCharges(widget.vendorid, widget.vehicletype).then((charges) {
      if (mounted) {
        setState(() {
          parkingCharges = charges;
        });
        print("Parking Charges Assigned: $parkingCharges");
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

  // Calculate parking end date (30 days from parked date)
  DateTime? calculateParkingEndDate(String parkedDate, String parkedTime) {
    try {
      return DateFormat('dd-MM-yyyy hh:mm a')
          .parse('$parkedDate $parkedTime')
          .add(const Duration(days: 30));
    } catch (e) {
      print('Error parsing parking end date: $e');
      return null;
    }
  }

  // Update remaining days message
  void updateRemainingDays() {
    if (parkingEndDate != null) {
      final remainingDays = parkingEndDate!.difference(DateTime.now()).inDays;
      setState(() {
        remainingDaysMessage = widget.status == "PARKED" && remainingDays >= 0
            ? (remainingDays == 0
            ? 'Parking ends today!'
            : '$remainingDays days left')
            : '';
      });
    }
  }

  // Update selected months
  void updateSelectedMonths(int months) {
    setState(() {
      selectedMonths = months;
      monthsNotifier.value = months;
    });
  }

  Future<Map<String, dynamic>> fetchGstData() async {
    final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/getgstfee'));
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

  double calculateTotalWithTaxes(double payableAmount) {
    double gstAmount = (payableAmount * gstPercentage) / 100;
    double roundedGst = double.parse(gstAmount.toStringAsFixed(2));
    double totalBeforeHandling = payableAmount + roundedGst;
    double totalWithHandling = totalBeforeHandling + handlingFee;
    double roundedTotal = totalWithHandling.ceilToDouble();
    totalAmountWithTaxes = roundedTotal;
    return double.parse(roundedTotal.toStringAsFixed(2));
  }

  // Fetch parking charges from the API
  Future<List<Exitcharge>> fetchParkingCharges(String vendorId,
      String vehicleType) async {
    final url = Uri.parse(
        '${ApiConfig.baseUrl}vendor/charges/$vendorId/$vehicleType');
    print('Fetching parking charges from URL: $url');
    try {
      final response = await http.get(url);
      print('Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data');

        final chargesData = data['transformedData'] ?? [];
        List<Exitcharge> charges =
        chargesData
            .map<Exitcharge>((item) => Exitcharge.fromJson(item))
            .toList();
        print('Fetched charges: $charges');
        return charges;
      } else {
        print('Failed to fetch parking charges, status code: ${response
            .statusCode}');
        throw Exception('Failed to fetch parking charges');
      }
    } catch (e) {
      print('Error fetching charges: $e');
      return [];
    }
  }

  double calculatePayableAmount(int months, String bookType) {
    if (parkingCharges.isEmpty) {
      return 0.0;
    }

    var monthlyCharge = parkingCharges.firstWhere(
          (charge) => charge.type.toLowerCase().startsWith('monthly'),
      orElse: () => Exitcharge(type: 'No charge', amount: 0.0, fullDayCharge: ''),
    );

    if (monthlyCharge.amount == 0.0) {
      print("No valid monthly charge found.");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No valid monthly charge found')),
      );
      return 0.0;
    }

    final payable = monthlyCharge.amount * months;
    print("Calculated payable amount: $payable for $months months");

    // Always round up to the next whole number
    return payable.ceilToDouble();
  }

  // Update payable duration for bookings
  void updatePayableTimes() {
    final now = DateTime.now();
    final updatedData = bookingDataNotifier.value.map((booking) {
      if (booking.status == 'PARKED') {
        final parkingTime = parseParkingDateTime(
            "${booking.parkeddate} ${booking.parkedtime}");
        final elapsed = now.difference(parkingTime);
        booking.payableDuration = elapsed;

        // Recalculate remaining days
        updateRemainingDays();
      }
      return booking;
    }).toList();

    setState(() {
      bookingDataNotifier.value = updatedData;
    });
  }

  // Fetch booking data from the API
  Future<List<Bookingdata>> fetchBookingData() async {
    final url = Uri.parse(
        '${ApiConfig.baseUrl}vendor/getbookingdata/${widget.vendorid}');
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
  // ${ApiConfig.baseUrl}
  Future<bool> updaterenew(String bookingId, int months, double payableAmount) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/renewmonthl/$bookingId');
    print('URL: $url'); // Log the URL

    try {
      // Calculate GST and handling fee
      double gstAmountValue = (payableAmount * gstPercentage) / 100;
      gstAmountValue = gstAmountValue.ceilToDouble();
      print('GST Amount: $gstAmountValue'); // Log GST amount

      double handlingFeeValue = handlingFee.ceilToDouble();
      print('Handling Fee: $handlingFeeValue'); // Log handling fee

      double roundedTotalAdditional = (payableAmount + gstAmountValue + handlingFeeValue).ceilToDouble();
      print('Total Additional Amount: $roundedTotalAdditional'); // Log total additional amount

      // Calculate new subscription end date
      DateTime newEndDate = _calculateNewEndDate();
      print('New End Date: $newEndDate'); // Log new end date

      // Format the new end date as dd-MM-yyyy
      String formattedEndDate = DateFormat('dd-MM-yyyy').format(newEndDate);
      print('Formatted End Date: $formattedEndDate'); // Log formatted end date

      // Construct the request body
      Map<String, dynamic> requestBody = widget.userid.isNotEmpty
          ? {
        'new_total_amount': roundedTotalAdditional,
        'gst_amount': gstAmountValue,
        'handling_fee': handlingFeeValue,
        'total_additional': roundedTotalAdditional,
        'new_subscription_enddate': formattedEndDate,
      }
          : {
        'new_total_amount': payableAmount,
        'total_additional': payableAmount,
        'new_subscription_enddate': formattedEndDate,
      };
      print('Request Body: $requestBody'); // Log request body

      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(requestBody),
      );
      print('Response Status Code: ${response.statusCode}'); // Log response status
      print('Response Body: ${response.body}'); // Log response body

      if (response.statusCode == 200) {
        print('Subscription renewed successfully to $formattedEndDate'); // Log success
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Subscription renewed successfully')),
          );
          Navigator.pop(context, true);
        }
        if (widget.onRefresh != null) {
          widget.onRefresh!();
          print('onRefresh callback triggered'); // Log onRefresh callback
        }
        return true;
      } else {
        if (mounted) {
          final errorData = json.decode(response.body);
          String errorMessage = errorData['error'] ?? 'Failed to renew subscription';
          print('Error Message: $errorMessage'); // Log error message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(errorMessage)),
          );
        }
        throw Exception('Failed to renew subscription');
      }
    } catch (e) {
      print('Error renewing subscription: $e'); // Log exception
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to renew subscription: $e')),
        );
      }
      Navigator.pop(context, false);
      return false;
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
  Future<void> createOrderAndOpenCheckout({double? customAmount}) async {
    // Print all widget properties at the start
    print('=== Starting createOrderAndOpenCheckout ===');
    print('Widget Properties:');
    print('  vendorid: ${widget.vendorid}');
    print('  bookingid: ${widget.bookingid}');
    print('  vehicletype: ${widget.vehicletype}');
    print('  vehiclenumber: ${widget.vehiclenumber}');
    print('  username: ${widget.username}');
    print('  phoneno: ${widget.phoneno}');
    print('  parkingtime: ${widget.parkingtime}');
    print('  bookingtypetemporary: ${widget.bookingtypetemporary}');
    print('  sts: ${widget.sts}');
    print('  cartype: ${widget.cartype}');
    print('  parkingdate: ${widget.parkingdate}');
    print('  parkeddate: ${widget.parkeddate}');
    print('  parkedtime: ${widget.parkedtime}');
    print('  status: ${widget.status}');
    print('  otp: ${widget.otp}');
    print('  userid: ${widget.userid}');
    print('  navi: ${widget.navi}');
    print('  totalamount: ${widget.totalamount}');
    print('  newEndDate: ${widget.newEndDate}');
    print('  gstfee: ${widget.gstfee}');
    print('  handlingfee: ${widget.handlingfee}');
    print('  amout: ${widget.amout}');
    print('  payableduration: ${widget.payableduration}');
    print('  venodorname: ${widget.venodorname}');
    print('  daysleft: ${widget.daysleft}');
    print('  subscriptionEndDate: ${widget.subscriptionEndDate}');

    final url = Uri.parse('${ApiConfig.baseUrl}vendor/create-order');
    print('🔗 Request URL: $url');

    try {
      // Determine the amount based on navi and userid
      double amount;
      if (widget.navi == "user" && widget.userid.isNotEmpty) {
        amount =  calculateTotalWithTaxes(payableAmount);
        print('💰 Amount Calculation: navi == "user" && userid.isNotEmpty');
        print('  Using calculateTotalWithTaxes(payableAmount): $amount');
      } else if (widget.userid.isNotEmpty) {
        amount = customAmount ?? calculateTotalWithTaxes(payableAmount);
        print('💰 Amount Calculation: userid.isNotEmpty');
        print('  Using calculateTotalWithTaxes(payableAmount): $amount');
      } else {
        amount = customAmount ?? payableAmount;
        print('💰 Amount Calculation: Vendor booking');
        print('  Using payableAmount: $amount');
      }

      final roundedAmount = amount.ceilToDouble(); // Round up to the next whole number
      final adjustmentAmount = roundedAmount - amount; // Difference for logging
      final amountInPaise = (roundedAmount * 100).toInt(); // Convert to paise for Razorpay

      print('💰 Original Amount (INR): $amount');
      print('💰 Adjustment Amount (INR): $adjustmentAmount');
      print('💰 Rounded Amount (INR): $roundedAmount');
      print('💰 Amount in Paise for Razorpay: $amountInPaise');
      print('👤 Booked by: ${widget.userid.isNotEmpty ? 'Customer' : 'Vendor'}');

      // Prepare request body
      Map<String, dynamic> requestBody = {
        'amount': (amountInPaise / 100).toStringAsFixed(2),
        'vendor_id': widget.vendorid,
        'plan_id': 'default_plan', // Replace with actual plan ID
        'transaction_name': 'UserBooking',
      };

      // Only include user_id if navi is not "user"
      if (widget.navi != "user") {
        requestBody['user_id'] = widget.userid;
        print('📦 Added user_id to request body: ${widget.userid}');
      }

      print('📦 Request Body: $requestBody');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(requestBody),
      );

      print('📥 Create Order Response Status: ${response.statusCode}');
      print('📥 Create Order Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        print('📥 Parsed Response Data: $responseData');
        if (responseData['success']) {
          print('✅ Order created successfully, opening checkout...');
          print('  Order ID: ${responseData['order']['id']}');
          openCheckout(responseData['order']['id'], customAmount: amount);
        } else {
          print('❌ Failed to create order: ${responseData['error']}');
          Fluttertoast.showToast(msg: "Failed to create order: ${responseData['error']}");
        }
      } else {
        print('❌ HTTP Request Failed: Status ${response.statusCode}');
        print('❌ Response Body: ${response.body}');
        Fluttertoast.showToast(msg: "Failed to create order: ${response.body}");
      }
    } catch (e) {
      print('🚨 Error creating order: ${e.toString()}');
      Fluttertoast.showToast(msg: "Error creating order: ${e.toString()}");
    }
    print('=== End of createOrderAndOpenCheckout ===');
  }
  void openCheckout(String orderId, {double? customAmount}) async {
    try {
      final amount = widget.navi == "user"
          ? (customAmount ?? payableAmount)
          : (customAmount ?? double.parse(widget.totalamount));
      final roundedAmount = amount.ceilToDouble();
      final adjustmentAmount = roundedAmount - amount;
      final amountInPaise = (roundedAmount * 100).toInt();
      print('🔍 Adjustment Amount: $adjustmentAmount');
      print('🔍 Rounded Amount: $roundedAmount');
      print('🔍 Amount in Paise: $amountInPaise');
      var options = {
        'key': 'rzp_live_LPTzyV62Bg6Zio',
        'order_id': orderId,
        'amount': amountInPaise,
        'name': 'ParkmyWheels',
        'description': 'Vehicle Parking Payment',
        'prefill': {
          'contact': _mobileNumberController.text,
          'email': _emailController.text,
          'name': _nameController.text,
        },
        'theme': {
          'color': '#3BA775',
        },
      };
      _razorpay!.open(options);
    } catch (e) {
      print('Error: $e');
      Fluttertoast.showToast(msg: "Error initiating payment: ${e.toString()}");
    }
  }
  Future<void> sucesspay({
    required String paymentId,
    required String userid,
    required String orderId,
    required double amount,
    required String transactionName,
    required String paymentStatus,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/usersucesspay/${widget.userid}');

    print('⏳ Starting payment success process...');
    print('🔗 URL: $url');
    print('📦 Request Data:');
    print('  - Payment ID: $paymentId');
    print('  - User ID: $userid');
    print('  - Order ID: $orderId');
    print('  - Amount: $amount');
    print('  - Vendor ID: ${widget.vendorid}');
    print('  - Transaction Name: $transactionName');
    print('  - Payment Status: $paymentStatus');

    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'payment_id': paymentId,
          'order_id': orderId,
          'amount': amount.toString(), // Use the passed amount (with or without taxes)
          'userid': userid,
          'vendorid': widget.vendorid,
          'transaction_name': transactionName,
          'payment_status': paymentStatus,
        }),
      );

      print('📥 Response Status: ${response.statusCode}');
      print('📥 Response Body: ${response.body}');

      if (response.statusCode == 200) {
        Fluttertoast.showToast(msg: "✅ Payment verified successfully");
        print('✅ Navigating to ParkingPage...');
      } else {
        throw Exception('❌ Failed to store payment data: ${response.body}');
      }
    } catch (e) {
      print('🚨 Error occurred: ${e.toString()}');
      Fluttertoast.showToast(msg: "Error saving payment details: ${e.toString()}");
    }
  }
  Future<void> _logPaymentEvent(String status, String? paymentId, String? orderId, String? message) async {
    final logUrl = Uri.parse('${ApiConfig.baseUrl}vendor/userlog/${widget.userid}');

    await http.post(
      Uri.parse(logUrl as String),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'payment_id': paymentId ?? '',
        'order_id': orderId ?? '',
        'vendor_id': widget.vendorid,
        'plan_id': widget.userid ?? '',
        'transaction_name': 'UserBooking',
        'payment_status': status,
        'amount': widget.totalamount,
        'message': message ?? '',
      }),
    );
  }

  void handlePaymentSuccessResponse(PaymentSuccessResponse response) {
    Fluttertoast.showToast(
      msg: "Payment Success: ${response.paymentId}",
      toastLength: Toast.LENGTH_SHORT,
    );
    print('🎉 Payment Success: ${response.paymentId}');
    print('🎉 Order ID: ${response.orderId}');
    print('🎉 Navi value: ${widget.navi}');

    // Check if navi is "user" - if so, go directly to subscription renewal
    if (widget.navi == "user") {
      print('🎉 Processing user payment directly...');
      _processUserPaymentDirectly(response);
    } else {
      print('🎉 Navigating to user payment page...');
      // Navigate to user payment page first
      _navigateToUserPaymentPage(response);
    }
  }

  void _navigateToUserPaymentPage(PaymentSuccessResponse response) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => UserPaymentVerificationPage(
          paymentId: response.paymentId!,
          orderId: response.orderId!,
          totalAmount: widget.totalamount,
          userid: widget.userid,
      vendorname: widget.venodorname,
          vendorid: widget.vendorid,
          amount: widget.amout,
          payableduration: widget.payableduration,
          bookingid: widget.bookingid,
          newEndDate: widget.newEndDate,
          gstfee: widget.gstfee,
          handlingfee: widget.handlingfee,
          onPaymentVerified: () {
            // This callback will be called after user payment verification
            _processPaymentAfterUserVerification(response);
          },
        ),
      ),
    );
  }

  void _processPaymentAfterUserVerification(PaymentSuccessResponse response) {
    // Now process the payment and update subscription end date
    sucesspay(
      paymentId: response.paymentId!,
      userid: widget.userid,
      orderId: response.orderId!,
      amount: double.parse(widget.totalamount),
      transactionName: 'UserBooking',
      paymentStatus: 'verified',
    );

    _renewAfterPaymentIfNeeded();
  }

  void _processUserPaymentDirectly(PaymentSuccessResponse response) {
    print('🔄 Processing user payment directly...');
    print('💰 Payable amount: $payableAmount');
    
    // Process payment directly for user navigation
    // Use the actual amount that was paid (total with taxes)
    double actualPaidAmount = calculateTotalWithTaxes(payableAmount);
    print('💰 Actual paid amount: $actualPaidAmount');
    
    print('🔄 Calling sucesspay...');
    sucesspay(
      paymentId: response.paymentId!,
      userid: widget.userid,
      orderId: response.orderId!,
      amount: actualPaidAmount,
      transactionName: 'UserBooking',
      paymentStatus: 'verified',
    );

    print('🔄 Calling subscription renewal...');
    // Renew subscription based on selected months and amount paid
    _renewSubscriptionAfterPayment(response);
  }

  Future<void> _renewSubscriptionAfterPayment(PaymentSuccessResponse response) async {
    try {
      print('🔄 Starting subscription renewal process...');
      print('📅 Selected months: $selectedMonths');
      print('💰 Payable amount: $payableAmount');
      
      // Calculate new subscription end date based on selected months
      DateTime newEndDate = _calculateNewEndDate();
      print('📅 New subscription end date: $newEndDate');
      
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/renewmonthl/${widget.bookingid}');
      print('🔗 Renewal URL: $url');
      
      // Use the total amount with taxes that was actually paid
      final double total = calculateTotalWithTaxes(payableAmount);
      final double gst = (payableAmount * gstPercentage) / 100;
      final double handling = handlingFee;
      
      print('💰 Total amount: $total');
      print('💰 GST amount: $gst');
      print('💰 Handling fee: $handling');
      
      final body = json.encode({
        'new_total_amount': total.ceilToDouble(),
        'gst_amount': gst.ceilToDouble(),
        'handling_fee': handling.ceilToDouble(),
        'total_additional': total.ceilToDouble(),
        'new_subscription_enddate': DateFormat('dd-MM-yyyy').format(newEndDate),
      });
      
      print('📦 Request body: $body');
      
      final resp = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: body,
      );
      
      print('📥 Response status: ${resp.statusCode}');
      print('📥 Response body: ${resp.body}');
      
      if (resp.statusCode == 200) {
        Fluttertoast.showToast(
          msg: "✅ Subscription renewed successfully!",
          toastLength: Toast.LENGTH_LONG,
        );
        print('✅ Subscription renewed successfully for ${selectedMonths} months');
        
        // Close the bottom sheet and refresh
        Navigator.pop(context);
        if (widget.onRefresh != null) {
          widget.onRefresh!();
        }
      } else {
        Fluttertoast.showToast(msg: '❌ Renew failed: ${resp.body}');
      }
    } catch (e) {
      Fluttertoast.showToast(msg: '❌ Renew error: $e');
    }
  }

  DateTime _calculateNewEndDate() {
    // Use subscription end date as base instead of parking end date
    DateTime baseDate;
    
    try {
      print('📅 Original subscription end date: ${widget.subscriptionEndDate}');
      
      // Parse the subscription end date
      String endDateStr = widget.subscriptionEndDate.split(' ')[0];
      print('📅 Extracted date string: $endDateStr');
      
      // Try different date formats
      try {
        baseDate = DateFormat('dd-MM-yyyy').parse(endDateStr);
        print('📅 Parsed with dd-MM-yyyy: $baseDate');
      } catch (e1) {
        try {
          baseDate = DateFormat('yyyy-MM-dd').parse(endDateStr);
          print('📅 Parsed with yyyy-MM-dd: $baseDate');
        } catch (e2) {
          // Try parsing as ISO date
          baseDate = DateTime.parse(endDateStr);
          print('📅 Parsed as ISO date: $baseDate');
        }
      }
    } catch (e) {
      print('❌ Error parsing subscription end date: $e');
      print('❌ Using current date as fallback');
      // Fallback to current date if parsing fails
      baseDate = DateTime.now();
    }
    
    int newMonth = baseDate.month + selectedMonths;
    int newYear = baseDate.year;
    
    // Handle year overflow
    while (newMonth > 12) {
      newMonth -= 12;
      newYear += 1;
    }
    
    // Clamp the day to the last valid day of the new month if needed
    int lastDayOfMonth = DateTime(newYear, newMonth + 1, 0).day;
    int adjustedDay = baseDate.day > lastDayOfMonth ? lastDayOfMonth : baseDate.day;
    
    DateTime finalDate = DateTime(newYear, newMonth, adjustedDay);
    print('📅 Final calculated date: $finalDate');
    print('📅 Formatted date: ${DateFormat('dd-MM-yyyy').format(finalDate)}');
    
    return finalDate;
  }

  Future<void> _renewAfterPaymentIfNeeded() async {
    try {
      if (widget.bookingid == null || widget.newEndDate == null) return;
      final url = Uri.parse('${ApiConfig.baseUrl}vendor/renewmonthl/${widget.bookingid}');
      final double total = double.tryParse(widget.totalamount) ?? 0;
      final double gst = double.tryParse(widget.gstfee) ?? 0;
      final double handling = double.tryParse(widget.handlingfee) ?? 0;
      final body = json.encode({
        'new_total_amount': total.ceilToDouble(),
        'gst_amount': gst.ceilToDouble(),
        'handling_fee': handling.ceilToDouble(),
        'total_additional': total.ceilToDouble(),
        'new_subscription_enddate': widget.newEndDate,
      });
      final resp = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: body,
      );
      if (resp.statusCode != 200) {
        Fluttertoast.showToast(msg: 'Renew failed: ${resp.body}');
      } else {
        Fluttertoast.showToast(msg: 'Subscription renewed');
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Renew error: $e');
    }
  }

  void handlePaymentErrorResponse(PaymentFailureResponse response) async {
    print("Payment Error Code: ${response.code}");
    print("Payment Error Message: ${response.message}");

    // Log error to the API
    await _logPaymentEvent('error', null, null, response.message);
    Fluttertoast.showToast(
      msg: "Payment Failed: ${response.message}",
      toastLength: Toast.LENGTH_SHORT,
    );
    print('Payment Failed: ${response.message}');

    // Show retry option
    _showRetryDialog();
  }

  void _showRetryDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          title: const Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red),
              SizedBox(width: 10),
              Text('Payment Failed'),
            ],
          ),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'There was an issue with the payment. Would you like to try again?',
                style: TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 20),
              Icon(Icons.payment, size: 50, color: Colors.grey),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                // For user navi, calculate payable amount based on selected months
                if (widget.navi == "user") {
                  double currentPayableAmount = calculatePayableAmount(
                    selectedMonths,
                    widget.bookingtypetemporary,
                  );
                  createOrderAndOpenCheckout(customAmount: currentPayableAmount); // Retry by creating a new order
                } else {
                double totalWithTaxes = calculateTotalWithTaxes(payableAmount);
                createOrderAndOpenCheckout(customAmount: totalWithTaxes); // Retry by creating a new order
                }
              },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                backgroundColor: Colors.blue.withOpacity(0.1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Retry',
                style: TextStyle(color: Colors.blue),
              ),
            ),
            TextButton(
              onPressed: () {

              },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                backgroundColor: Colors.grey.withOpacity(0.1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  void handleExternalWallet(ExternalWalletResponse response) async {
    await _logPaymentEvent('external_wallet', null, null, response.walletName);
    Fluttertoast.showToast(
      msg: "External Wallet: ${response.walletName}",
      toastLength: Toast.LENGTH_SHORT,
    );
    print('External Wallet: ${response.walletName}');
  }
  @override
  void dispose() {
    _payableTimer.cancel();
    _otpController.dispose();
    _mobileNumberController.dispose();
    _emailController.dispose();
    _nameController.dispose();
    _razorpay?.clear();
    bookingDataNotifier.dispose();
    monthsNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery
        .of(context)
        .size
        .height;
    final screenWidth = MediaQuery
        .of(context)
        .size
        .width;
    final textScaleFactor = MediaQuery
        .of(context)
        .textScaleFactor;

    return isLoading
        ? const LoadingGif()
        : Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(30),
              topRight: Radius.circular(30),
            ),
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: screenWidth * 0.04,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 10),
                  Column(
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [],
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
                              print('Close button pressed');
                              Navigator.pop(context);
                            },
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              child: const Icon(
                                  Icons.cancel_outlined, size: 20),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Flexible(
                        flex: 0,
                        child: Container(
                          padding: EdgeInsets.all(screenWidth * 0.01),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: screenWidth * 0.35,
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
                                size: Size(
                                    screenWidth * 0.35, screenWidth * 0.35),
                                painter: RadialTicksPainter(),
                              ),
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SvgPicture.asset(
                                    'assets/car.svg',
                                    width: screenWidth * 0.08,
                                    height: screenWidth * 0.08,
                                  ),
                                  SizedBox(height: screenHeight * 0.002),
                                  Text(
                                    'Remaining',
                                    style: GoogleFonts.poppins(
                                      color: Colors.black,
                                      fontSize: 12 * textScaleFactor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: screenHeight * 0.001),
                                  if (remainingDaysMessage.isNotEmpty)
                                    Text(
               widget. daysleft,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 10 * textScaleFactor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Flexible(
                        flex: 1,
                        child: Container(
                          child: Padding(
                            padding: EdgeInsets.all(screenWidth * 0.01),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment
                                      .spaceBetween,
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
                                              (booking) =>
                                          booking.id == widget.bookingid,
                                          orElse: () =>
                                              Bookingdata(
                                                invoiceid: "",
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
                                                userid: '', subscriptionenddate: '', totalamout: '', amount: '', invoice: '', exitvehicledate: '', exitvehicletime: '',
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
                                          selectedMonths,
                                          booking.bookType,
                                        );

                                        return Text(
                                          ' ${booking.id.length > 8
                                              ? booking.id.substring(
                                              booking.id.length - 8)
                                              : booking.id}',
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
                                  mainAxisAlignment: MainAxisAlignment
                                      .spaceBetween,
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
                                      "${widget.parkingdate ?? ''} ${widget
                                          .parkingtime ?? ''}",
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
                                  mainAxisAlignment: MainAxisAlignment
                                      .spaceBetween,
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
                                SizedBox(height: screenHeight * 0.001),
                                const Divider(),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment
                                      .spaceBetween,
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
                                      widget.sts ?? '',
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
                                  mainAxisAlignment: MainAxisAlignment
                                      .spaceBetween,
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
                                      " ${widget.userid.isEmpty
                                          ? 'Vendor'
                                          : 'Customer'}",
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
                  const Divider(),

                  // Month selection widget
                  // SizedBox(height: screenHeight * 0.02),

                  // SizedBox(height: screenHeight * 0.01),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      Text(
                        "Select Renewal Period:",
                        style: GoogleFonts.poppins(
                          fontSize: 14 * textScaleFactor,
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Spacer(),
                      SizedBox(width: screenWidth * 0.02),
                      GestureDetector(
                        onTap: () {
                          if (selectedMonths > 1) {
                            updateSelectedMonths(selectedMonths - 1);
                          }
                        },
                        child: CircleAvatar(
                          radius: screenWidth * 0.03, // control size
                          backgroundColor: Colors.grey.shade300,
                          child: Icon(Icons.remove,
                              size: screenWidth * 0.04, color: Colors.black87),
                        ),
                      ),
                      SizedBox(width: screenWidth * 0.02),
                      ValueListenableBuilder<int>(
                        valueListenable: monthsNotifier,
                        builder: (context, months, child) {
                          return Text(
                            "$months ${months == 1 ? 'Month' : 'Months'}",
                            style: GoogleFonts.poppins(
                              fontSize: 16 * textScaleFactor,
                              color: ColorUtils.primarycolor(),
                              fontWeight: FontWeight.bold,
                            ),
                          );
                        },
                      ),
                      SizedBox(width: screenWidth * 0.02),
                      GestureDetector(
                        onTap: () {
                          if (selectedMonths < 12) {
                            updateSelectedMonths(selectedMonths + 1);
                          }
                        },
                        child: CircleAvatar(
                          radius: screenWidth * 0.03,
                          backgroundColor: Colors.grey.shade300,
                          child: Icon(Icons.add,
                              size: screenWidth * 0.04, color: Colors.black87),
                        ),
                      ),
                    ],
                  ),



                  const Divider(),
                  // Text(
                  //   "Price Details:",
                  //   style: GoogleFonts.poppins(
                  //     fontSize: 14 * textScaleFactor,
                  //     color: Colors.black,
                  //     fontWeight: FontWeight.bold,
                  //   ),
                  // ),
                  // const Divider(),
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
                      ValueListenableBuilder<int>(
                        valueListenable: monthsNotifier,
                        builder: (context, months, child) {
                          double payableAmount = calculatePayableAmount(
                            months,
                            widget.bookingtypetemporary,
                          );
                          return Text(
                            "₹${payableAmount.toStringAsFixed(2)}",
                            style: GoogleFonts.poppins(
                              fontSize: 12 * textScaleFactor,
                              color: Colors.black,
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
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
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
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
                        ValueListenableBuilder<int>(
                          valueListenable: monthsNotifier,
                          builder: (context, months, child) {
                            double payableAmount = calculatePayableAmount(
                              months,
                              widget.bookingtypetemporary,
                            );
                            double gstAmount = (payableAmount * gstPercentage) /
                                100;
                            double roundedGst = gstAmount.ceilToDouble();

                            return Text(
                              "₹${roundedGst.toStringAsFixed(2)}",
                              style: GoogleFonts.poppins(
                                fontSize: 12 * textScaleFactor,
                                color: Colors.black,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
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
                        ValueListenableBuilder<int>(
                          valueListenable: monthsNotifier,
                          builder: (context, months, child) {
                            double calculatedPayableAmount = calculatePayableAmount(
                              months,
                              widget.bookingtypetemporary,
                            );
                            // Update the class variable
                            payableAmount = calculatedPayableAmount;
                            selectedMonths = months;
                            
                            double total = calculateTotalWithTaxes(
                                calculatedPayableAmount);

                            return Text(
                              "₹${total.toStringAsFixed(2)}",
                              style: GoogleFonts.poppins(
                                fontSize: 14 * textScaleFactor,
                                color: ColorUtils.primarycolor(),
                                fontWeight: FontWeight.bold,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                  SizedBox(height: screenHeight * 0.02),
                  if (!isLoading) ...[
                    Align(
                      alignment: Alignment.bottomRight,
                      child: ValueListenableBuilder<int>(
                        valueListenable: monthsNotifier,
                        builder: (context, months, child) {
                          double payableAmount = calculatePayableAmount(
                            months,
                            widget.bookingtypetemporary,
                          );
                          return SizedBox(

                            height: screenHeight * 0.04,
                            child: ElevatedButton(
                              onPressed: () {
                                if (widget.navi.isEmpty) {
                                  // If navi is empty, directly call updaterenew
                                  updaterenew(
                                  widget.bookingid,
                                  selectedMonths,
                                  payableAmount,
                                );
                                } else if (widget.navi == "user") {
                                  // If navi is "user", initiate Razorpay payment
                                  _nameController.text = widget.username;
                                  _mobileNumberController.text = widget.phoneno;
                                  // Optionally set email if available
                                  _emailController.text = ''; // Set a default or fetch email if available
                                  // For user navi, calculate payable amount based on selected months
                                  double currentPayableAmount = calculatePayableAmount(
                                    selectedMonths,
                                    widget.bookingtypetemporary,
                                  );
                                  createOrderAndOpenCheckout(customAmount: currentPayableAmount);
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
                                    'Renew Parking',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12 * textScaleFactor,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                  SizedBox(height: screenHeight * 0.05),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}




class subexit extends StatefulWidget {
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
  final String parkeddate;
  final String parkedtime;
  final String status;
  final String otp;
  final String userid;

  const subexit({
    super.key,
    required this.userid,
    required this.bookingid,
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
    required this.parkeddate,
    required this.parkedtime,
    required this.status,
    required this.otp,
  });

  @override
  _subexitState createState() => _subexitState();
}

class _subexitState extends State<subexit> {
  late final Timer _payableTimer;
  ValueNotifier<List<Bookingdata>> bookingDataNotifier = ValueNotifier([]);
  DateTime? parkingEndDate;
  String remainingDaysMessage = '';
  double payableAmount = 0.0;
  final TextEditingController _otpController = TextEditingController();
  bool isLoading = true;
  List<Exitcharge> parkingCharges = [];
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double roundedAmount = 0.0;
  double decimalDifference = 0.0;
  double totalAmountWithTaxes = 0.0;
  bool isOtpEntered = false;

  @override
  void initState() {
    super.initState();

    // Initialize timer to update payable duration
    _payableTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        updatePayableTimes();
      }
    });

    fetchGstData().then((gstData) {
      if (mounted) {
        setState(() {
          gstPercentage = double.tryParse(gstData['gst'] ?? '0') ?? 0.0;
          handlingFee = double.tryParse(gstData['handlingfee'] ?? '0') ?? 0.0;
        });
      }
    }).then((_) {
      // Then fetch other data
      _initializeData();
    });
  }

  void _initializeData() {
    // Calculate parking end date and remaining days
    parkingEndDate = calculateParkingEndDate(widget.parkeddate, widget.parkedtime);
    updateRemainingDays();

    // Fetch Parking Charges and Bookings Data
    fetchParkingCharges(widget.vendorid, widget.vehicletype).then((charges) {
      if (mounted) {
        setState(() {
          parkingCharges = charges;
        });
        print("Parking Charges Assigned: $parkingCharges");
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

  // Calculate parking end date (30 days from parked date)
  DateTime? calculateParkingEndDate(String parkedDate, String parkedTime) {
    try {
      return DateFormat('dd-MM-yyyy hh:mm a')
          .parse('$parkedDate $parkedTime')
          .add(const Duration(days: 30));
    } catch (e) {
      print('Error parsing parking end date: $e');
      return null;
    }
  }

  // Update remaining days message
  void updateRemainingDays() {
    if (parkingEndDate != null) {
      final remainingDays = parkingEndDate!.difference(DateTime.now()).inDays;
      setState(() {
        remainingDaysMessage = widget.status == "PARKED" && remainingDays >= 0
            ? (remainingDays == 0 ? 'Parking ends today!' : '$remainingDays days left')
            : '';
      });
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

  double calculateTotalWithTaxes(double payableAmount) {
    // Calculate GST amount
    double gstAmount = (payableAmount * gstPercentage) / 100;
    double roundedGst = double.parse(gstAmount.toStringAsFixed(2)); // Round to 2 decimal places

    // Calculate total before handling fee
    double totalBeforeHandling = payableAmount + roundedGst;

    // Add handling fee
    double totalWithHandling = totalBeforeHandling + handlingFee;

    // Round up to the next whole number
    double roundedTotal = totalWithHandling.ceilToDouble();
    totalAmountWithTaxes = roundedTotal;

    return double.parse(roundedTotal.toStringAsFixed(2));
  }
  // Fetch parking charges from the API
  Future<List<Exitcharge>> fetchParkingCharges(String vendorId, String vehicleType) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/charges/$vendorId/$vehicleType');
    print('Fetching parking charges from URL: $url');
    try {
      final response = await http.get(url);
      print('Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data');

        final chargesData = data['transformedData'] ?? [];
        List<Exitcharge> charges =
        chargesData.map<Exitcharge>((item) => Exitcharge.fromJson(item)).toList();
        print('Fetched charges: $charges');
        return charges;
      } else {
        print('Failed to fetch parking charges, status code: ${response.statusCode}');
        throw Exception('Failed to fetch parking charges');
      }
    } catch (e) {
      print('Error fetching charges: $e');
      return [];
    }
  }

  double calculatePayableAmount(Duration duration, String bookType, String parkedDate, String parkedTime) {
    if (parkingCharges.isEmpty) {
      return 0.0;
    }

    var monthlyCharge = parkingCharges.firstWhere(
          (charge) => charge.type.toLowerCase().startsWith('monthly'),
      orElse: () => Exitcharge(type: 'No charge', amount: 0.0, fullDayCharge: ''),
    );

    if (monthlyCharge.amount == 0.0) {
      print("No valid monthly charge found.");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No valid monthly charge found')),
      );
      return 0.0;
    }

    final totalDays = duration.inDays;
    print("Total Days: $totalDays");

    if (totalDays == 0) {
      print("Total days is 0, returning monthly charge as payable amount.");
      // Round up to next whole number
      return monthlyCharge.amount.ceilToDouble();
    }

    final numberOfMonths = (totalDays / 30).ceil();
    print("Number of Months: $numberOfMonths");

    final payable = monthlyCharge.amount * numberOfMonths;
    print("Calculated payable amount: $payable for $numberOfMonths months");

    // Always round up to the next whole number
    return payable.ceilToDouble();
  }
  // Update payable duration for bookings
  void updatePayableTimes() {
    final now = DateTime.now();
    final updatedData = bookingDataNotifier.value.map((booking) {
      if (booking.status == 'PARKED') {
        final parkingTime = parseParkingDateTime("${booking.parkeddate} ${booking.parkedtime}");
        final elapsed = now.difference(parkingTime);
        booking.payableDuration = elapsed;

        // Recalculate remaining days
        updateRemainingDays();
      }
      return booking;
    }).toList();

    setState(() {
      bookingDataNotifier.value = updatedData;
    });
  }

  // Fetch booking data from the API
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

  // Update exit data in the backend
  Future<void> updateExitData(String bookingId) async {
    print("Calling exit API for bookingId: $bookingId"); // 👈 log before API call

    final url = Uri.parse('${ApiConfig.baseUrl}vendor/exitvendorsubscription/$bookingId');
    try {
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({}),
      );

      print("API response status: ${response.statusCode}"); // 👈 log status
      print("API response body: ${response.body}");          // 👈 log body

      if (response.statusCode == 200) {
        print('Booking updated successfully ✅');
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => viewsubscriptionamout(vendorid: widget.vendorid)),
        );
      } else {
        throw Exception('Failed to update booking: ${response.body}');
      }
    } catch (e) {
      print('Error: $e'); // 👈 log error
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
  void dispose() {
    _payableTimer.cancel();
    _otpController.dispose();
    bookingDataNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final textScaleFactor = MediaQuery.of(context).textScaleFactor;

    return isLoading
        ? const LoadingGif()
        : Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(30),
              topRight: Radius.circular(30),
            ),
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: screenWidth * 0.04,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 10),
                  Column(
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [],
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
                              print('Close button pressed');
                              Navigator.pop(context);
                            },
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              child: const Icon(Icons.cancel_outlined, size: 20),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Flexible(
                        flex: 0,
                        child: Container(
                          padding: EdgeInsets.all(screenWidth * 0.01),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: screenWidth * 0.35,
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
                                    width: screenWidth * 0.08,
                                    height: screenWidth * 0.08,
                                  ),
                                  SizedBox(height: screenHeight * 0.002),
                                  Text(
                                    'Remaining',
                                    style: GoogleFonts.poppins(
                                      color: Colors.black,
                                      fontSize: 12 * textScaleFactor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: screenHeight * 0.001),
                                  if (remainingDaysMessage.isNotEmpty)
                                    Text(
                                      remainingDaysMessage,
                                      style: GoogleFonts.poppins(
                                        color: Colors.black,
                                        fontSize: 10 * textScaleFactor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Flexible(
                        flex: 1,
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
                                            invoiceid: "",
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
                                            userid: '', subscriptionenddate: '', totalamout: '', amount: '', invoice: '', exitvehicledate: '', exitvehicletime: '',
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

                                        return Text(
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
                                      "Booking Type: ",
                                      style: GoogleFonts.poppins(
                                        color: Colors.grey,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10 * textScaleFactor,
                                      ),
                                    ),
                                    Text(
                                      widget.sts ?? '',
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
                  const Divider(),
                  const SizedBox(height: 5),
           Text("Are you sure want to exit the vehicle",           style: GoogleFonts.poppins(
             color: Colors.black,
             fontWeight: FontWeight.bold,
             fontSize: 16 * textScaleFactor,
           ),),
                  SizedBox(height: screenHeight * 0.02),
                  if (!isLoading) ...[
                    Align(
                      alignment: Alignment.bottomRight,
                      child: SizedBox(
                        height: screenHeight * 0.04,
                        child: ElevatedButton(
                          onPressed: () {
                            final booking = bookingDataNotifier.value.firstWhere(
                                  (booking) => booking.id == widget.bookingid,
                              orElse: () => Bookingdata(
                                invoiceid: "",
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
                                userid: '', subscriptionenddate: '', totalamout: '', amount: '', invoice: '', exitvehicledate: '', exitvehicletime: '',
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
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
}
// Assuming Exitcharge and RadialTicksPainter are the same as in the previous code
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
      amount: parsedAmount,
      type: json['type'] ?? '',
      fullDayCharge: json['fullDayCharge'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'type': type,
      'fullDayCharge': fullDayCharge,
    };
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
      final angle = (2 * pi / totalTicks) * i - pi / 2;
      final isLargeTick = i % 5 == 0;

      if (angle >= -pi / 2 && angle <= pi / 2) {
        tickPaint.color = ColorUtils.primarycolor();
      } else {
        tickPaint.color = Colors.black;
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