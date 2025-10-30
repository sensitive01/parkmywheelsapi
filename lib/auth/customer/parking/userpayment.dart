import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:mywheels/auth/customer/parking/parking.dart';
import 'package:mywheels/config/authconfig.dart';
import 'package:mywheels/model/user.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:http/http.dart' as http; // Add this for API calls

class UserPayment extends StatefulWidget {
  final String userid;
  final String vehicleid;
  final String mobilenumber;
  final String amout;
  final String payableduration;
  final String vendorid;
  final String venodorname;
  final String handlingfee;
  final String gstfee;
  final String totalamount;
  // Renewal extras
  final String? bookingid;
  final int? months;
  final String? newEndDate; // dd-MM-yyyy
  const UserPayment({
    super.key,
    required this.userid,
    required this.vehicleid,
    required this.amout,
    required this.payableduration,
    required this.mobilenumber,
    required this.vendorid,
    required this.venodorname, required this.handlingfee, required this.gstfee, required this.totalamount,
    this.bookingid,
    this.months,
    this.newEndDate,
  });

  @override
  State<StatefulWidget> createState() => _PaymentState();
}

class _PaymentState extends State<UserPayment> {
  Razorpay? _razorpay;
  bool _isLoading = false;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  @override
  void initState() {
    super.initState();
    _fetchUserData();
    _razorpay = Razorpay();
    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, handlePaymentSuccessResponse);
    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, handlePaymentErrorResponse);
    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, handleExternalWallet);
    bool isLoading = false;
    // Automatically create order and open Razorpay on page load
    Future.delayed(const Duration(milliseconds: 500), () {
      createOrderAndOpenCheckout();
    });
  }
  User? _user;
  Future<void> _fetchUserData() async {
    setState(() {
      _isLoading = true; // Start loading
    });
    await Future.delayed(const Duration(seconds: 0)); // Wait for 2 seconds

    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-userdata?id=${widget.userid}'));
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        if (data['success'] && data['data'] != null) {
          setState(() {
            _user = User.fromJson(data['data']);
            _nameController.text = _user?.username ?? '';
            _mobileNumberController.text = _user?.mobileNumber ?? '';
            _emailController.text = _user?.email ?? '';

          });
        } else {
          throw Exception(data['message']);
        }
      } else {
        throw Exception('Failed to load user data');
      }
    } catch (error) {
      print('Error fetching user data: $error');
    } finally {
      setState(() {
        _isLoading = false; // Stop loading
      });
    }
  }
  Future<void> createOrderAndOpenCheckout() async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/create-order');

    try {
      final amount = double.parse(widget.totalamount); // e.g., ₹1012.44
      final roundedAmount = amount.ceilToDouble(); // Round up to ₹1013.00
      final adjustmentAmount = roundedAmount - amount; // e.g., ₹1013.00 - ₹1012.44 = ₹0.56
      final amountInPaise = (roundedAmount * 100).toInt(); // 101300 paise
      print('🔍 Original Amount (INR): $amount');
      print('🔍 Adjustment Amount (INR): $adjustmentAmount');
      print('🔍 Rounded Amount (INR): $roundedAmount');
      print('🔍 Sending Amount to Backend (Paise): $amountInPaise');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'amount': (amountInPaise / 100).toStringAsFixed(2),
          'vendor_id': widget.vendorid, // Use the actual vendor ID
          'plan_id':  'default_plan', // Replace with actual plan ID
          'user_id': widget.userid,
          'transaction_name': 'UserBooking',
        }),
      );

      print('📥 Create Order Response Status: ${response.statusCode}');
      print('📥 Create Order Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        if (responseData['success']) {
          openCheckout(responseData['order']['id']);
        } else {
          Fluttertoast.showToast(msg: "Failed to create order: ${responseData['error']}");
        }
      } else {
        Fluttertoast.showToast(msg: "Failed to create order: ${response.body}");
      }
    } catch (e) {
      print('🚨 Error creating order: ${e.toString()}');
      Fluttertoast.showToast(msg: "Error creating order: ${e.toString()}");
    }
  }

  void openCheckout(String orderId) async {
    try {
      print('🔍 Total Amount (Raw): ${widget.totalamount}');
      final amount = double.parse(widget.totalamount); // e.g., ₹1012.44
      final roundedAmount = amount.ceilToDouble(); // Round up to ₹1013.00
      final adjustmentAmount = roundedAmount - amount; // e.g., ₹0.56
      final amountInPaise = (roundedAmount * 100).toInt(); // 101300 paise
      print('🔍 Adjustment Amount: $adjustmentAmount');
      print('🔍 Rounded Amount: $roundedAmount');
      print('🔍 Amount in Paise: $amountInPaise');
      var options = {

        'key': 'rzp_live_LPTzyV62Bg6Zio',
        // 'key': 'rzp_test_qhgo9LI3Vj3gub',
        'order_id': orderId, // Use the order ID from the backend
        'amount': amountInPaise, // Convert to paise
        'name': 'ParkmyWheels',
        'description': 'Vehicle Parking Payment',
        'prefill': {
          'contact': _mobileNumberController.text,
          'email': _emailController.text, // Add email from controller
          'name': _nameController.text,  // Add name from controller
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
    required String vendorname,
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
          'amount': widget.totalamount,
          'userid': userid,
          'vendorname': widget.venodorname,
          'vendorid': widget.vendorid,
          'transaction_name': transactionName,
          'payment_status': paymentStatus,
        }),
      );

      print('📥 Response Status: ${response.statusCode}');
      print('📥 Response Body: ${response.body}');

      if (response.statusCode == 200) {
        Fluttertoast.showToast(msg: "✅ Payment verified successfully");
        print('✅ Payment successful, processing complete...');
        // Navigation is now handled in handlePaymentSuccessResponse
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

  void handlePaymentSuccessResponse(PaymentSuccessResponse response) async {
    Fluttertoast.showToast(
      msg: "Payment Success: ${response.paymentId}",
      toastLength: Toast.LENGTH_SHORT,
    );
    print('Payment Success: ${response.paymentId}');
    
    // Process payment success and store data
    await sucesspay(
      vendorname: widget.venodorname,
      paymentId: response.paymentId!,
      userid: widget.userid,
      orderId: response.orderId!,
      amount: double.parse(widget.amout),
      transactionName: 'UserBooking',
      paymentStatus: 'verified',
    );

    await storePaymentData(
      response.paymentId!,
      widget.payableduration,
      double.parse(widget.totalamount),
    );
    
    await _renewAfterPaymentIfNeeded();
    
    // Now navigate back to the calling page
    Navigator.pop(context, true); // Return true to indicate successful payment
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
                createOrderAndOpenCheckout(); // Retry by creating a new order
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
                Navigator.pop(context, false); // Return false to indicate cancellation
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
    _razorpay?.clear();
    super.dispose();
  }

  Future<void> storePaymentData(String bookingId, String formattedDuration, double totalAmount) async {
    final url = Uri.parse('${ApiConfig.baseUrl}vendor/exitvehicle/${widget.vehicleid}');
    print('Attempting to store payment data...');
    print('Booking ID: $bookingId');
    print('Formatted Duration: $formattedDuration');
    print('Total Amount: $totalAmount');
    print('API URL: $url');

    try {
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'amount': totalAmount,
          'hour': formattedDuration,
          'gstamout': widget.gstfee,
          'handlingfee': widget.handlingfee,
          'totalamout': widget.totalamount,
        }),
      );

      print('HTTP PUT request sent. Waiting for response...');

      if (response.statusCode == 200) {
        print('Response received. Status code: ${response.statusCode}');
        print('Thank you! Visit again.');
        
        // Check if this is a renewal payment (has bookingid) - if so, don't navigate away
        // Let the calling page handle the navigation and refresh
        if (widget.bookingid != null) {
          print('🔄 This is a renewal payment, staying on current page for refresh');
          // Don't navigate away - let the calling page handle refresh
        } else {
          // This is a regular parking payment, navigate to ParkingPage
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => ParkingPage(userId: widget.userid)),
          );
        }
      } else {
        print('Failed to update booking. Status code: ${response.statusCode}. Response: ${response.body}');
        throw Exception('Failed to update booking');
      }
    } catch (e) {
      print('Error occurred while storing payment data: $e');
      // Fluttertoast.showToast(msg: "Error storing payment data: ${e.toString()}");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Processing Payment')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 20),
            Text("Processing payment, please wait..."),
          ],
        ),
      ),
    );
  }
}