import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';
import 'package:mywheels/auth/customer/parking/bookparking.dart';
import 'package:mywheels/auth/customer/parking/parking.dart';
import 'package:mywheels/auth/customer/parking/userpayment.dart';
import 'package:mywheels/explorebooknow.dart' hide Vendor;
import 'package:mywheels/model/user.dart';
import 'package:mywheels/pageloader.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:permission_handler/permission_handler.dart';
import 'package:pretty_qr_code/pretty_qr_code.dart';
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/authconfig.dart';
import '../../../config/colorcode.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:pdf/pdf.dart' as pw; // Ensure this import is present
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
class uParkingDetails extends StatefulWidget {
  final String userid;
  final String vehiclenumber;
  final String vendorname;
  final String vendorid;
  final String parkingdate;
  final String parkingtime;
  final String bookedid;
  final String schedule;
  final String bookeddate;
  final String vehicletype;
  final String status;
  final String otp;
  final String bookingtype;
  final String sts;
  final String nav;
  final String mobilenumber;
  final String invoice;
  final String invoiceid;
  final String parkeddate;
  final String parkedtime;
  final String subscriptionenddate;
  final String exitdate;
  final String exittime;
  const uParkingDetails({
    super.key,
    required this.invoice,
    required this.invoiceid,
    required this.mobilenumber,
    required this.bookedid,
    required this.userid,
    required this.schedule,
    required this.bookeddate,
    required this.vehiclenumber,
    required this.vendorname,
    required this.vendorid,
    required this.parkingdate,
    required this.parkingtime,
    required this.vehicletype,
    required this .status,
    required this.bookingtype,
    required this.sts,
    required this.otp, required this.nav, required this.parkeddate, required this.parkedtime, required this.subscriptionenddate, required this.exitdate, required this.exittime,
  });

  @override
  _uParkingDetailsState createState() => _uParkingDetailsState();
}

class _uParkingDetailsState extends State<uParkingDetails> {
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double totalAmountWithTaxes = 0.0;
  double payableAmount = 0.0; // To store the payable amount for the booking
  bool isLoading = false;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  List<dynamic> charges = [];

  late Position _currentPosition;
  List<String> favoriteVendorIds = [];
  List<String> amenities = []; // Add your amenities list
  List<Services> services = []; // Add your services list
  int selectedTabIndex = 0; // Track selected tab index
  double containerHeight = 500.0; // Define the containerHeight variable
  Map<String, dynamic>? _transactionDetails; // Store transaction details
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
  User? _user;
  Vendor? _vendor;
  @override
  void initState() {

    super.initState();
    _fetchTransactionDetails();
    _fetchUserData();

    fetchChargesData(widget.vendorid, widget.vehicletype);
    // Ensure vendor ID is not null before fetching amenities and parking
    if (_vendor?.id != null) {
      fetchAmenitiesAndParking(_vendor!.id).then((amenitiesAndParking) {
        setState(() {
          amenities = amenitiesAndParking
              .amenities; // Update the state with fetched amenities
          services = amenitiesAndParking
              .services; // Update the state with fetched services
        });
        // Print the amenities and services after fetching
        print('Fetched Amenities: $amenities');
        print('Fetched Services: $services');
      }).catchError((error) {
        print('Error fetching amenities: $error'); // Debugging print statement
      });
    }
    _fetchVendorData();
    if (widget.status == "PARKED") {
      _fetchPayableAmount(widget.bookedid);
    }
  }

  Future<void> _fetchUserData() async {
    setState(() {
      isLoading = true; // Start loading
    });

    await Future.delayed(const Duration(seconds: 2)); // Wait for 2 seconds

    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-userdata?id=${widget.userid}'));
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        if (data['success'] && data['data'] != null) {
          setState(() {
            _user = User.fromJson(data['data']);
            _nameController.text = _user?.username ?? '';
            _mobileNumberController.text = _user?.mobileNumber ?? '';
            // _emailController.text = _user?.email ?? '';
            // _vehicleController.text = _user?.vehicleNumber ?? '';
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
        isLoading = false; // End loading
      });
    }
  }

  Future<void> fetchChargesData(String vendorId, String selectedCarType) async {
    setState(() {
      isLoading = true; // Start loading
    });
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(
        Uri.parse(
            '${ApiConfig.baseUrl}vendor/fetchbookcharge/$vendorId/$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        // Check if the response contains the expected charges list
        if (data is List) {
          setState(() {
            charges = List<Map<String, dynamic>>.from(data);
          });
        } else if (data['vendor'] != null &&
            data['vendor']['charges'] != null) {
          setState(() {
            charges =
                List<Map<String, dynamic>>.from(data['vendor']['charges']);
          });
        } else {
          print('Charges data is missing or invalid in the response.');
          setState(() {
            charges = []; // Reset charges if data is invalid
          });
        }
      } else {
        print(
            'Failed to load charges data. Status Code: ${response.statusCode}');
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
        isLoading = false; // Stop loading
      });
    }
  }


  void _showTransactionDetailsBottomSheet() {
    if (_transactionDetails == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transaction details not available')),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              "Transaction Details",
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Base Amount:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['amount']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Handling Fee:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['handlingfee']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "GST:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['gst']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Total Amount:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['totalAmount']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 16),

          ],
        ),
      ),
    );
  }
  double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371; // Radius of the Earth in kilometers
    double dLat = _degreesToRadians(lat2 - lat1);
    double dLon = _degreesToRadians(lon2 - lon1);

    double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) *
            cos(_degreesToRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  double _degreesToRadians(double degrees) {
    return degrees * (pi / 180);
  }

  Future<AmenitiesAndParking> fetchAmenitiesAndParking(String vendorId) async {
    final url =
        Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId');

    try {
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Check if the response contains the expected structure
        if (data['AmenitiesData'] != null) {
          // Print the fetched amenities data
          print('Fetched Amenities Data: ${data['AmenitiesData']}');
          return AmenitiesAndParking.fromJson(data);
        } else {
          throw Exception('AmenitiesData is null in response');
        }
      } else {
        throw Exception('Failed to load data: ${response.statusCode}');
      }
    } catch (e) {
      print('Error: $e');
      throw Exception('Error fetching data: $e');
    }
  }


  String apiUrl = '${ApiConfig.baseUrl}vendor/fetch-all-vendor-data';
  Future<Map<String, dynamic>> fetchAmountDetailsByBookingId(String bookingId) async {
    try {
      print('Fetching booking details for ID: $bookingId');

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/getbooking/$bookingId'),
      );

      print('API response status: ${response.statusCode}');
      print('API response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);

        print('Parsed JSON response: $jsonResponse');

        if (jsonResponse['message'] == 'Booking details fetched successfully') {
          final data = jsonResponse['data'];
          print('Extracted booking data: $data');

          final amount = data['amount'] ?? '0';
          final gst = data['gstamout'] ?? '0';
          final handlingfee = data['handlingfee']?? '0';
          final totalAmount = data['totalamout'] ?? '0';

          print('Amount: $amount, GST: $gst, Total Amount: $totalAmount');

          return {
            'amount': amount,
            'gst': gst,
            'handlingfee':handlingfee,
            'totalAmount': totalAmount,
          };
        } else {
          throw Exception('Failed to fetch booking: ${jsonResponse['message']}');
        }
      } else {
        throw Exception('Failed to fetch booking: ${response.statusCode}');
      }
    } catch (e) {
      print('Exception occurred: $e');
      throw Exception('Error fetching booking details: $e');
    }
  }

  Future<void> _fetchTransactionDetails() async {
    try {
      final transactionData = await fetchAmountDetailsByBookingId(widget.bookedid);
      setState(() {
        _transactionDetails = transactionData;
      });
    } catch (e) {
      print('Error fetching transaction details: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to load transaction details. Please try again later.'),
        ),
      );
    }
  }
// Function to fetch vendor data
  Future<List<Map<String, dynamic>>> fetchVendors() async {
    setState(() {
      isLoading = true; // Set loading to true while fetching data
    });
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(Uri.parse(apiUrl));
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);

        if (jsonResponse['data'] != null) {
          return (jsonResponse['data'] as List).map((vendor) {
            double? latitude;
            double? longitude;

            // Attempt to parse latitude and longitude
            try {
              latitude = double.tryParse(
                  vendor['latitude'] ?? '0.0'); // Use '0.0' as default
              longitude = double.tryParse(
                  vendor['longitude'] ?? '0.0'); // Use '0.0' as default
            } catch (e) {
              print('Error parsing latitude/longitude: $e');
            }

            return {
              'id': vendor['_id'] ?? '',
              'name': vendor['vendorName'] ??
                  'Unknown Vendor', // Default name if null
              'latitude': latitude ?? 0.0, // Default to 0.0 if parsing fails
              'longitude': longitude ?? 0.0, // Default to 0.0 if parsing fails
              'image': vendor['image'] ?? '', // Default to empty string if null
              'address':
                  vendor['address'] ?? 'No Address', // Default address if null
              'contactNo': vendor['contactNo'] ??
                  'No Contact', // Default contact if null
              'landMark': vendor['landMark'] ??
                  'No Landmark', // Default landmark if null
            };
          }).toList();
        } else {
          print('No vendor data found');
          return [];
        }
      } else {
        print('Failed to load vendors: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('Error fetching vendors: $e');
      return [];
    } finally {
      setState(() {
        isLoading = false; // Set loading to false once the data is fetched
      });
    }
  }




  Future<void> _fetchVendorData() async {
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(Uri.parse(
          '${ApiConfig.baseUrl}vendor/fetch-vendor-data?id=${widget.vendorid}'));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['data'] != null) {
          setState(() {
            _vendor = Vendor.fromJson(data['data']);
            isLoading = false; // Hide loading indicator after data is fetched
          });

          // Now that _vendor is initialized, fetch amenities and parking
          fetchAmenitiesAndParking(_vendor!.id).then((amenitiesAndParking) {
            setState(() {
              amenities = amenitiesAndParking
                  .amenities; // Update the state with fetched amenities
              services = amenitiesAndParking
                  .services; // Update the state with fetched services
            });
          }).catchError((error) {
            print(
                'Error fetching amenities: $error'); // Debugging print statement
          });
        } else {
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception(
            'Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Failed to load vendor data. Please try again later.')),
      );
      setState(() {
        isLoading = false; // Hide loading indicator if there's an error
      });
    }
  }
  Future<Map<String, dynamic>> fetchGstData() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}vendor/getgstfee'));
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data is List && data.isNotEmpty) {
        return data[0];
      }
      return {'gst': '0', 'handlingfee': '0'};
    } else {
      throw Exception('Failed to load GST fees');
    }
  }

  // Fetch payable amount for the booking
  Future<void> _fetchPayableAmount(String bookingId) async {
    final String url = "${ApiConfig.baseUrl}vendor/fet/$bookingId";
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success']) {
          setState(() {
            payableAmount = double.tryParse(data['payableAmount'].toString()) ?? 0.0;
          });
        } else {
          print('Failed to fetch payable amount: ${data['message']}');
        }
      } else {
        print('Failed to load payable amount: ${response.statusCode}');
      }
    } catch (error) {
      print('Error fetching payable amount: $error');
    }
  }

  // Calculate total amount with taxes
  double calculateTotalWithTaxes(double payableAmount) {
    final gstAmount = (payableAmount * gstPercentage) / 100;
    totalAmountWithTaxes = payableAmount + gstAmount + handlingFee;
    return totalAmountWithTaxes;
  }

  // Show exit confirmation bottom sheet
  void _showExitConfirmation() async {
    try {
      final gstData = await fetchGstData();
      setState(() {
        gstPercentage = double.tryParse(gstData['gst'].toString()) ?? 0.0;
        handlingFee = double.tryParse(gstData['handlingfee'].toString()) ?? 0.0;
      });

      // Round up payableAmount to the next integer
      final roundedPayableAmount = payableAmount.ceil().toDouble();
      // Calculate GST and round up to the next integer
      final gstAmount = ((roundedPayableAmount * gstPercentage) / 100).ceil().toDouble();
      // Calculate total amount with taxes
      totalAmountWithTaxes = roundedPayableAmount + gstAmount + handlingFee;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Exit Parking",
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Base Amount:",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${roundedPayableAmount.toStringAsFixed(0)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Handling Fee:",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${handlingFee.toStringAsFixed(2)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "GST ($gstPercentage%):",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${gstAmount.toStringAsFixed(0)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Total Amount:",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${totalAmountWithTaxes.toStringAsFixed(2)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: SizedBox(
                        height: 35,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context); // Close the bottom sheet
                            _navigateToPayment(); // Proceed to payment
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorUtils.primarycolor(),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: Text(
                            "Pay Now",
                            style: GoogleFonts.poppins(color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      );
    } catch (error) {
      print('Error fetching GST data: $error');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load GST and handling fee data')),
      );
    }
  }
  Future<void> _generateInvoicePdf() async {
    final pdf = pw.Document();

    // Load Google Fonts for the PDF
    final font = await PdfGoogleFonts.poppinsRegular();
    final boldFont = await PdfGoogleFonts.poppinsBold();
    final logoImage = await rootBundle.load('assets/top.png');
    final logoImageBytes = logoImage.buffer.asUint8List();
    final pwImage = pw.MemoryImage(logoImageBytes);

    // Helper function to get display-friendly booking type
    String getBookingTypeDisplay() {
      if (widget.sts == null || widget.sts.isEmpty) return 'N/A';
      if (widget.bookingtype == '24 Hours') return 'Full Day';
      return widget.sts; // always show sts value
    }

    // Define date format for parsing widget.schedule
    final dateFormat = DateFormat('dd MMM, yyyy, hh:mm a');

    // Determine fromDate and toDate based on widget.sts
    String fromDate;
    String toDate;

    if (widget.sts == 'Instant' || widget.sts == 'Schedule') {
      fromDate = "${widget.parkeddate}, ${widget.parkedtime}";
      toDate = "${widget.exitdate}, ${widget.exittime}";
    } else if (widget.sts == 'Subscription') {
      fromDate = "${widget.parkeddate}, ${widget.parkedtime}";
      toDate = widget.subscriptionenddate;
    } else {
      fromDate = widget.parkeddate;
      toDate = widget.subscriptionenddate;
    }

    try {
      if (widget.sts == 'Instant' || widget.sts == 'Schedule') {
        final parsedDate = dateFormat.parse(fromDate);
        final endDate = dateFormat.parse(toDate);
        fromDate = DateFormat('dd MMM yyyy, hh:mm a').format(parsedDate);
        toDate = DateFormat('dd MMM yyyy, hh:mm a').format(endDate);
      } else if (widget.sts == 'Subscription') {
        final parsedDate = dateFormat.parse(fromDate);
        final endDate = dateFormat.parse(toDate);
        fromDate = DateFormat('dd MMM yyyy, hh:mm a').format(parsedDate);
        toDate = DateFormat('dd MMM yyyy, hh:mm a').format(endDate);
      }
    } catch (e) {
      print('Error parsing date: $e');
      if (widget.sts == 'Instant' || widget.sts == 'Schedule') {
        fromDate = "${widget.parkeddate}, ${widget.parkedtime}";
        toDate = "${widget.exitdate}, ${widget.exittime}";
      } else if (widget.sts == 'Subscription') {
        fromDate = "${widget.parkeddate}, ${widget.parkedtime}";
        toDate = widget.subscriptionenddate;
      } else {
        fromDate = DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.now());
        toDate = 'N/A';
      }
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'ParkMyWheels – Parking Invoice',
                      style: pw.TextStyle(
                        font: boldFont,
                        fontSize: 14,
                        color: PdfColor.fromInt(ColorUtils.primarycolor().value),
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 5),
                    pw.Text(
                      'Smart Parking Made Easy!',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left side: Invoice Details
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Invoice No: PMW-${widget.bookedid}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Date of Issue: ${DateTime.now().toString().split(' ')[0]}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                  // Right side: Image
                  pw.Image(
                    pwImage,
                    width: 100,
                    height: 100,
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Customer Details
              pw.Text(
                'Customer Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Left side: Customer Details
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Name: ${_user?.username ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Vehicle Number: ${widget.vehiclenumber}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Vehicle Type: ${widget.vehicletype}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                  // Right side: Parking Location, Vendor, and Vendor Address
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'Parking Location',
                        style: pw.TextStyle(font: font, fontSize: 14),
                      ),
                      pw.Text(
                        '${widget.vendorname ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Address: ${_vendor?.address ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Subscription Details
              pw.Text(
                'Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Table(
                border: pw.TableBorder.all(),
                columnWidths: {
                  0: pw.FlexColumnWidth(1),
                  1: pw.FlexColumnWidth(1),
                  2: pw.FlexColumnWidth(1),
                  3: pw.FlexColumnWidth(1),
                },
                children: [
                  // Header Row
                  pw.TableRow(
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromInt(ColorUtils.primarycolor().value),
                    ),
                    children: [
                      for (var header in ['Description', 'Parked on', 'Exit on', 'Fees (₹)'])
                        pw.Padding(
                          padding: pw.EdgeInsets.all(8),
                          child: pw.Center(
                            child: pw.Text(
                              header,
                              textAlign: pw.TextAlign.center,
                              style: pw.TextStyle(
                                font: boldFont,
                                fontSize: 12,
                                color: PdfColor.fromInt(ColorUtils.whiteclr().value),
                                fontWeight: pw.FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),

                  // Data Row
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            getBookingTypeDisplay(),
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            fromDate,
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            toDate,
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            _transactionDetails?['amount'] ?? '0.00',
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 20),

              // Total Payable
              pw.Text(
                'Total Payable',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'Base Amount: ₹${_transactionDetails?['amount'] ?? '0.00'}',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                  // Only show Handling Fee if it's non-zero
                  if ((_transactionDetails?['handlingfee'] ?? '0') != '0' &&
                      double.tryParse(_transactionDetails?['handlingfee']?.toString() ?? '0') != 0.0)
                    pw.Text(
                      'Handling Fee: ₹${_transactionDetails?['handlingfee'] ?? '0.00'}',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  // Only show GST if it's non-zero
                  if ((_transactionDetails?['gst'] ?? '0') != '0' &&
                      double.tryParse(_transactionDetails?['gst']?.toString() ?? '0') != 0.0)
                    pw.Text(
                      'GST: ₹${_transactionDetails?['gst'] ?? '0.00'}',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  pw.Text(
                    'Total Amount (in INR): ₹${_transactionDetails?['totalAmount'] ?? '0.00'}',
                    style: pw.TextStyle(font: font, fontSize: 12, fontWeight: pw.FontWeight.bold),
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Payment Details
              pw.Text(
                'Payment Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Mode of Payment: ${widget.invoice != null ? 'Online' : 'Cash'}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.Text(
                'Transaction ID: ${widget.invoice}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.SizedBox(height: 20),

              // Authorized Signature
              pw.Text(
                'Authorized Signature',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Digitally signed by ParkMyWheels',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.Text(
                '(This is a computer-generated invoice and does not require a physical signature.)',
                style: pw.TextStyle(font: font, fontSize: 10),
              ),
              pw.SizedBox(height: 20),

              // Footer
              pw.Column(
                children: [
                  pw.Text(
                    'Website: www.parkmywheels.com',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                  pw.Text(
                    'Email: parkmywheels3@gmail.com',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    // Display the PDF
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
    );
  }
  // Navigate to payment page
  void _navigateToPayment() {
    final roundedPayableAmount = payableAmount.ceil().toDouble();
    // Calculate GST and round up to the next integer
    final gstAmount = ((roundedPayableAmount * gstPercentage) / 100).ceil().toDouble();
    // Calculate total amount with rounded values
    final totalAmount = roundedPayableAmount + gstAmount + handlingFee;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => UserPayment(
          venodorname: widget.vendorname,
          vendorid: widget.vendorid,
          userid: widget.userid,
          mobilenumber:  _user?.username ?? '', // You may need to fetch this from user data
          vehicleid: widget.bookedid,
          amout: payableAmount.toString(),
          payableduration: '', // You may need to fetch or calculate this
          handlingfee: handlingFee.toString(),
          gstfee: gstAmount.toString(),
          totalamount: totalAmount.toString(),
        ),
      ),
    );
  }
  @override
  Widget build(BuildContext context) {
    return isLoading
        ? const LoadingGif() // Show loading GIF before the Scaffold
        :Scaffold(
      body: Column(
        children: [
          Expanded(
            child: _buildDetailsTab(), // This allows the tab to take available space
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsTab() {
    return CustomScrollView(slivers: [
      SliverAppBar(
      expandedHeight: 180.0,
      pinned: true,
      backgroundColor: Colors.transparent,
      leading: IconButton(
        icon: const Icon(Icons.arrow_circle_left, color: Colors.white),
        onPressed: () {
          Navigator.pop(context);
        },
      ),
      title: Text(
        _vendor?.vendorName ?? '',
        style: GoogleFonts.poppins(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          shadows: [
            Shadow(
              offset: const Offset(1, 1),
              blurRadius: 3,
              color: Colors.black.withOpacity(0.7),
            ),
          ],
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.parallax, // smooth scroll effect
        background: Stack(
          fit: StackFit.expand,
          children: [
            // --- Image Background ---
            ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(15),
                bottomRight: Radius.circular(15),
              ),
              child: Image.network(
                _vendor?.image ?? '',
                fit: BoxFit.cover,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Center(
                    child: LoadingAnimationWidget.halfTriangleDot(
                      color: Colors.white,
                      size: 50,
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: ColorUtils.primarycolor(),
                    child: const Center(
                      child: Icon(Icons.error, color: Colors.white, size: 40),
                    ),
                  );
                },
              ),
            ),

            // --- Gradient Overlay (for better text contrast) ---
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.6),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
    SliverToBoxAdapter(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_vendor != null) ...[

                  Column(
                    children: [
                      Column(
                        children: [
                          Container(
                            // color: ColorUtils.primarycolor(),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: ColorUtils
                                  .primarycolor(), // Ensure the background color is set
                              borderRadius: const BorderRadius.only(
                                bottomLeft: Radius.circular(15),
                                bottomRight: Radius.circular(15),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment
                                  .start, // Aligns everything to the top
                              children: [
                                Expanded(
                                  // Ensures the column takes only necessary space
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment
                                        .start, // Aligns text to the left
                                    mainAxisSize: MainAxisSize
                                        .min, // Reduces extra space
                                    children: [
                                      const SizedBox(height: 5),
                                      SizedBox(
                                        child: Text(
                                          _vendor?.vendorName ?? '',
                                          style: GoogleFonts.poppins(
                                            fontSize: 14,
                                            height: 1.2,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(
                                          height: 0), // Adjusted spacing
                                      Text(
                                        _vendor!.address,
                                        style: GoogleFonts.poppins(
                                            fontSize: 12,
                                            height: 1.2,
                                            color: Colors.white),
                                      ),
                                      const SizedBox(height: 5),
                                    ],
                                  ),
                                ),
                                Column(
                                  children: [
                                    const SizedBox(height: 5),
                                    Padding(
                                      padding: const EdgeInsets.all(5.0),
                                      child: GestureDetector(
                                        onTap: () async {
                                          final double latitude =
                                              double.tryParse(
                                                      _vendor?.latitude ??
                                                          '0') ??
                                                  0.0;
                                          final double longitude =
                                              double.tryParse(
                                                      _vendor?.longitude ??
                                                          '0') ??
                                                  0.0;

                                          final String googleMapsUrl =
                                              'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude';

                                          if (await canLaunch(
                                              googleMapsUrl)) {
                                            await launch(googleMapsUrl);
                                          } else {
                                            debugPrint(
                                                "Could not launch $googleMapsUrl");
                                          }
                                        },
                                        child: Container(
                                          height: 20,
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 5),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius:
                                                BorderRadius.circular(3),
                                            border: Border.all(
                                                color: Colors.white,
                                                width: 1.2),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                '${_vendor?.distance != null ? _vendor!.distance?.toStringAsFixed(2) : 'N/A'} km',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: Colors.black,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              const Icon(Icons.telegram,
                                                  size: 16.0,
                                                  color: Colors.blue),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          // const SizedBox(height: 5), // Reduced spacing
                        ],
                      ),
                      const SizedBox(height: 8),

                       Padding(
                         padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                         child: SizedBox(
                          height: 200,
                             child: Stack(
                             children: [

                             Positioned(
                             left: 0,
                             top: 10,
                             right: 0,
                             child: Container(
                             height: 190, // Set the appropriate height
                             decoration: BoxDecoration(
                             color: ColorUtils.primarycolor(),
                             borderRadius: const BorderRadius.only(
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
                             alignment: Alignment.bottomCenter,
                             child:  Row(
                               mainAxisAlignment:
                               MainAxisAlignment.center,
                               children: [
                                 if (widget.status != "COMPLETED" &&
                                     widget.status != "Cancelled") ...[
                                   Text(
                                     "OTP: ",
                                     style: GoogleFonts.poppins(
                                       fontWeight: FontWeight.bold,
                                       color: Colors.white,
                                       fontSize: 16,
                                     ),
                                   ),
                                   ...(widget.otp.length >= 3
                                       ? (widget.status == 'PARKED'
                                       ? widget.otp
                                       .substring(widget.otp.length - 3)
                                       .split('')
                                       .map((digit) => _pinBox(digit))
                                       : widget.otp
                                       .substring(0, 3)
                                       .split('')
                                       .map((digit) => _pinBox(digit)))
                                       : [
                                     Text(
                                       "Invalid OTP ID",
                                       style: GoogleFonts.poppins(
                                         color: Colors.white,
                                         fontWeight: FontWeight.bold,
                                       ),
                                     )
                                   ])
                                 ],
                                 // Show "Book Again" button for completed or cancelled bookings
                                 if (widget.status == "COMPLETED" ||
                                     widget.status == "Cancelled")

                                   ElevatedButton(
                                     onPressed: () {
                                       Navigator.push(
                                         context,
                                         MaterialPageRoute(
                                           builder: (context) =>
                                               ExploreBook(
                                                 vendorId: widget.vendorid,
                                                 userId: widget.userid,
                                                 vendorName:widget.vendorname,
                                               ),
                                         ),
                                       );
                                       print("Book Again pressed");
                                     },
                                     style: ElevatedButton.styleFrom(
                                       backgroundColor: Colors.white,
                                       foregroundColor: ColorUtils.primarycolor(),
                                       shape: RoundedRectangleBorder(
                                         borderRadius: BorderRadius.circular(5),
                                       ),
                                       padding: const EdgeInsets.symmetric(
                                         horizontal: 8,
                                         vertical: 6,
                                       ),
                                       minimumSize: const Size(100, 10), // small button
                                     ),
                                     child: Text(
                                       "Book Again",
                                       style: GoogleFonts.poppins(
                                         fontSize: 14,
                                         fontWeight: FontWeight.bold,
                                       ),
                                     ),
                                   ),
                               ],
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
                                 color: Colors.white,
                                 child: Align(
                                   alignment: Alignment.center, // Aligns content to the left
                                   child: Text(
                                     "Booking details",
                                     style: GoogleFonts.poppins(
                                       fontSize: 16,
                                       fontWeight: FontWeight.bold,
                                       // decoration: TextDecoration.underline, // Add underline here
                                       decorationColor: Colors.black, // Optional: Set the color of the underline
                                       // Optional: Set the thickness of the underline
                                     ),
                                   ),
                                 ),
                               ),
                               Divider(
                                 thickness: 0.5, // Set the thickness of the divider
                                 color: ColorUtils.primarycolor(), // Set the color of the divider
                               ),
                             // Container(
                             // padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                             // decoration: BoxDecoration(
                             // border: Border(
                             // bottom: BorderSide(
                             // color: ColorUtils.primarycolor(), // Replace with ColorUtils.primarycolor()
                             // width: 0.5,
                             // ),
                             // ),
                             // borderRadius: const BorderRadius.only(
                             // topLeft: Radius.circular(5.0),
                             // topRight: Radius.circular(5.0),
                             // ),
                             // ),
                             // child: Row(
                             // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                             // children: [
                             //   Padding(
                             //     padding: const EdgeInsets.only(right: 12.0),
                             //     child: Text(
                             //       widget.vehiclenumber,
                             //       style: GoogleFonts.poppins(
                             //         color:ColorUtils.primarycolor(),
                             //         fontWeight: FontWeight.bold,
                             //       ),
                             //     ),
                             //   ),
                             // const Spacer(),
                             // Padding(
                             // padding: const EdgeInsets.only(right: 12.0),
                             // child: Text(
                             // widget.status,
                             // style: GoogleFonts.poppins(
                             // color:ColorUtils.primarycolor(),
                             // fontWeight: FontWeight.bold,
                             // ),
                             // ),
                             // ),
                             //
                             // ],
                             // ),
                             // ),
                               Row(
                                 mainAxisAlignment:
                                 MainAxisAlignment.start,
                                 crossAxisAlignment:
                                 CrossAxisAlignment.start,
                                 children: [
                                   ClipPath(
                                     clipper: TicketClipper(),
                                     child: Container(
                                       padding: const EdgeInsets.all(5),
                                       decoration: const BoxDecoration(),
                                       child: Column(
                                         crossAxisAlignment:
                                         CrossAxisAlignment.center,
                                         children: [
                                           Container(
                                             // decoration: BoxDecoration(
                                             //   color: Colors.white,
                                             //   borderRadius: BorderRadius.circular(16),
                                             //   boxShadow: const [
                                             //     BoxShadow(
                                             //       color: Colors.black12,
                                             //       blurRadius: 4,
                                             //     ),
                                             //   ],
                                             // ),
                                             padding:
                                             const EdgeInsets.all(10),
                                             child: PrettyQr(
                                               data: widget.bookedid,
                                               size: 100,
                                               roundEdges: true,
                                               errorCorrectLevel:
                                               QrErrorCorrectLevel.H,
                                               elementColor: Colors.black,
                                             ),
                                           ),
                                         ],
                                       ),
                                     ),
                                   ),
                                   const SizedBox(
                                       width:
                                       2), // Spacing between QR and details
                                   Expanded(
                                     child: Column(
                                       crossAxisAlignment:
                                       CrossAxisAlignment.start,
                                       children: [

                                         const SizedBox(
                                             height:
                                             13),
                                         Text(
                                           " ${widget.vehiclenumber.toString()}",
                                           style: GoogleFonts.poppins(fontSize: 16),
                                         ),
                                         Text(
                                           "Booking date:${widget.bookeddate.toString()}",
                                           style: GoogleFonts.poppins(fontSize: 11),
                                         ),
                                         Text(
                                           "Parking date:${widget.schedule.toString()}",
                                           style: GoogleFonts.poppins(fontSize: 11),
                                         ),

                                         Text(
                                           "Status: ${widget.status.toString()},",
                                           style: GoogleFonts.poppins(fontSize: 11),
                                         ),
                                         Text(
                                           "Mobile Number: ${widget.mobilenumber.toString()},",
                                           style: GoogleFonts.poppins(fontSize: 11),
                                         ),
                                         Column(
                                           crossAxisAlignment: CrossAxisAlignment.start,
                                           children: [
                                             // Text(
                                             //   ": ${widget.sts}",
                                             //   style: GoogleFonts.poppins(fontSize: 11),
                                             // ),
                                             Text(
                                               "Booking Type: ${widget.sts == 'Subscription' ? 'Monthly' : (widget.bookingtype == '24 Hours' ? 'Full Day' : 'Hourly')}",
                                               style: GoogleFonts.poppins(fontSize: 11),
                                             ),
                                           ],
                                         )

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
                       ),

                      Padding(
                        padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                        child: Column(
                          children: [


                            const SizedBox(height: 15),
                            if (widget.status.toString() == "COMPLETED")

                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.white, // Move color inside decoration
                                  borderRadius: BorderRadius.circular(5), // Set border radius
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      spreadRadius: 1,
                                      blurRadius: 2,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                // color: Colors.white,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(width: 10,),
                                    Text(
                                      "Invoice",
                                      style: GoogleFonts.poppins(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Spacer(),
                                    TextButton.icon(
                                      onPressed: _transactionDetails == null
                                          ? null
                                          : () {
                                        _generateInvoicePdf();
                                      },
                                      icon: Icon(
                                        Icons.remove_red_eye,
                                        color: ColorUtils.primarycolor(),
                                      ),
                                      label: Text(
                                        "View",
                                        style: TextStyle(
                                          color: ColorUtils.primarycolor(),
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),

                                  ],
                                ),
                              ),
                            const SizedBox(height: 10),
                            if (widget.status.toString() == "COMPLETED")
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.white, // Move color inside decoration
                                  borderRadius: BorderRadius.circular(5), // Set border radius
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      spreadRadius: 1,
                                      blurRadius: 2,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                // color: Colors.white,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(width: 10,),
                                    Text(
                                      "Transaction details",
                                      style: GoogleFonts.poppins(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Spacer(),
                                    TextButton.icon(
                                      onPressed: _showTransactionDetailsBottomSheet,
                                      icon: Icon(
                                        Icons.remove_red_eye,
                                        color: ColorUtils.primarycolor(),
                                      ),
                                      label: Text(
                                        "View",
                                        style: TextStyle(
                                          color: ColorUtils.primarycolor(),
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),

                                  ],
                                ),
                              ),



                            const SizedBox(height: 15),
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white, // Move color inside decoration
                                borderRadius: BorderRadius.circular(5), // Set border radius
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    spreadRadius: 1,
                                    blurRadius: 2,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              // color: Colors.white,
                              child: Column(
                                children: [
                                  const SizedBox(height: 5),
                                  Container(
                                    color: Colors.white,
                                    child: Align(
                                      alignment: Alignment.center, // Aligns content to the left
                                      child: Text(
                                        "Price details",
                                        style: GoogleFonts.poppins(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          // decoration: TextDecoration.underline, // Add underline here
                                          decorationColor: Colors.black, // Optional: Set the color of the underline
                                          // Optional: Set the thickness of the underline
                                        ),
                                      ),
                                    ),
                                  ),
                                  Divider(
                                    thickness: 0.5, // Set the thickness of the divider
                                    color: ColorUtils.primarycolor(), // Set the color of the divider
                                  ),
                                  // const SizedBox(height: 2),
                                  Container(
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: Colors.white, // Move color inside decoration
                                      borderRadius: BorderRadius.circular(5), // Set border radius
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.1),
                                          spreadRadius: 1,
                                          blurRadius: 2,
                                          offset: const Offset(0, 3),
                                        ),
                                      ],
                                    ),
                                    child: Center(
                                      child: SingleChildScrollView(
                                        scrollDirection: Axis.horizontal, // Enable horizontal scrolling
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.center, // Center items inside Row
                                          children: List.generate(charges.length, (index) {
                                            var charge = charges[index];
                                            return Row(
                                              children: [
                                                Container(
                                                  width: 85, // Set width for each item
                                                  padding: const EdgeInsets.symmetric(
                                                      vertical: 6, horizontal: 4), // Reduce vertical padding
                                                  child: Column(
                                                    mainAxisSize: MainAxisSize.min,
                                                    mainAxisAlignment: MainAxisAlignment.center, // Center content vertically
                                                    crossAxisAlignment: CrossAxisAlignment.center,
                                                    children: [
                                                      Text(
                                                        charge['type'],
                                                        style: GoogleFonts.poppins(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 10,
                                                          height: 1.2, // Reduce line spacing
                                                        ),
                                                        textAlign: TextAlign.center,
                                                      ),
                                                      const SizedBox(height: 1), // Reduce space between text
                                                      Text(
                                                        "₹${charge['amount']}",
                                                        style: GoogleFonts.poppins(
                                                          color: Colors.black,
                                                          fontSize: 14,
                                                          height: 1.2, // Reduce line spacing
                                                        ),
                                                        textAlign: TextAlign.center,
                                                      ),
                                                    ],
                                                  ),
                                                ),
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
                                    ),
                                  ),
                                ],
                              ),
                            ),


        const SizedBox(height: 8),
    if (amenities.isNotEmpty) ...[
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white, // Move color inside decoration
                                borderRadius: BorderRadius.circular(5), // Set border radius
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
                                children: [
                                  const SizedBox(height: 5),

                                  Container(
                                    color: Colors.white,
                                    child: Align(
                                      alignment: Alignment.center, // Aligns content to the left
                                      child: Text(
                                        "Facilities",
                                        style: GoogleFonts.poppins(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          // decoration: TextDecoration.underline, // Add underline here
                                          decorationColor: Colors.black, // Optional: Set the color of the underline
                                          // Optional: Set the thickness of the underline
                                        ),
                                      ),
                                    ),
                                  ),
                                  Divider(
                                    thickness: 0.5, // Set the thickness of the divider
                                    color: ColorUtils.primarycolor(), // Set the color of the divider
                                  ),
                                  //
                                  Padding(
                                    padding: const EdgeInsets.all(5.0),
                                    child: Wrap(
                                      spacing: 6.0,
                                      runSpacing: 6.0,
                                      children: amenities.map((amenity) {
                                        return Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                              // color:  ColorUtils.primarycolor() ,
                                              borderRadius: BorderRadius.circular(5),
                                              border: Border.all(
                                                color: Colors.black, // Set the color of the border
                                                width: 0.5, // Set the width of the border
                                              ),
                                              boxShadow: const [
                                                // BoxShadow(
                                                //   color: Colors.black26,
                                                //   blurRadius: 4.0,
                                                //   offset: Offset(0, 2),
                                                // ),
                                              ]),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                _getAmenityIcon(amenity),
                                                size: 12,
                                                color: Colors.black,
                                              ),
                                              const SizedBox(width: 5),
                                              Text(
                                                amenity,
                                                style: GoogleFonts.poppins(
                                                  color: Colors.black,
                                                  fontSize: 12,
                                                  // fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                ],
                              ),
                            ),
],
                            const SizedBox(height: 8),
    if (services.isNotEmpty) ...[
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white, // Move color inside decoration
                                borderRadius: BorderRadius.circular(5), // Set border radius
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
                                children: [

                                  Container(
                                    color: Colors.white,
                                    child: Align(
                                      alignment: Alignment.center, // Aligns content to the left
                                      child: Text(
                                        "Additional Services",
                                        style: GoogleFonts.poppins(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          // decoration: TextDecoration.underline, // Add underline here
                                          decorationColor: Colors.black, // Optional: Set the color of the underline
                                          // Optional: Set the thickness of the underline
                                        ),
                                      ),
                                    ),
                                  ),
                                  Divider(
                                    thickness: 0.5, // Set the thickness of the divider
                                    color: ColorUtils.primarycolor(), // Set the color of the divider
                                  ),
                                  const SizedBox(height: 8),
                                  // Heading Card


                                  // Loop through the services list
                                  Wrap(
                                    spacing: 6.0,
                                    runSpacing: 6.0,
                                    children: services.asMap().entries.map((entry) {
                                      final s = entry.value;

                                      return Container(
                                        // width: 100, // Adjust width as needed
                                        padding: const EdgeInsets.all(5.0),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: Colors.black, width: 0.5),
                                          borderRadius: BorderRadius.circular(8.0),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              s.type,
                                              style: GoogleFonts.poppins(fontSize: 12),
                                              textAlign: TextAlign.center,
                                              softWrap: true,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            Text(
                                              ": ₹${s.amount}",
                                              style: GoogleFonts.poppins(fontSize: 12),
                                              textAlign: TextAlign.center,
                                            ),
                                          ],
                                        ),
                                      );
                                    }).toList(),
                                  ),

                                  const SizedBox(height: 8),
                                ],
                              ),
                            ),
],
                            // Add more widgets as needed
                            // Google Map
                            const SizedBox(height: 8),
                            Container(
                              decoration: BoxDecoration(
                                // color: Colors.white, // Move color inside decoration
                                borderRadius: BorderRadius.circular(5), // Set border radius
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    spreadRadius: 1,
                                    blurRadius: 2,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              // color: Colors.white,
                              child: Column(
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 5),
                                    child: Container(
                                      width: double.infinity,
                                      height: 150,
                                      decoration: BoxDecoration(
                                        // border:
                                        //     Border.all(color: Colors.grey),
                                        borderRadius:
                                            BorderRadius.circular(5.0),
                                      ),
                                      child: ClipRRect(
                                        borderRadius:
                                            BorderRadius.circular(5.0),
                                        child: GoogleMap(
                                          initialCameraPosition:
                                              CameraPosition(
                                            target: LatLng(
                                              double.tryParse(
                                                      _vendor?.latitude ??
                                                          '0') ??
                                                  0.0, // Convert latitude to double
                                              double.tryParse(
                                                      _vendor?.longitude ??
                                                          '0') ??
                                                  0.0,
                                            ),
                                            zoom: 15,
                                          ),
                                          markers: {
                                            Marker(
                                              markerId: const MarkerId(
                                                  'vendor_location'),
                                              position: LatLng(
                                                double.tryParse(
                                                        _vendor?.latitude ??
                                                            '0') ??
                                                    0.0, // Convert latitude to double
                                                double.tryParse(
                                                        _vendor?.longitude ??
                                                            '0') ??
                                                    0.0,
                                              ),
                                            ),
                                          },
                                        ),
                                      ),
                                    ),
                                  ),

                                  if (widget.status.toString() == "PARKED" && widget.nav == "daily")
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: payableAmount == 0.0
                                          ? SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                              ColorUtils.primarycolor()),
                                        ),
                                      )
                                          : SizedBox(
                                        height: 30,
                                        child: ElevatedButton(
                                          onPressed: () {
                                            _showExitConfirmation();
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.white,
                                            foregroundColor: Colors.red,
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 10, vertical: 5),
                                            minimumSize: const Size(0, 0),
                                            shape: const RoundedRectangleBorder(
                                              borderRadius:
                                              BorderRadius.all(Radius.circular(5)),
                                              side: BorderSide(
                                                color: Colors.red,
                                                width: 0.5,
                                              ),
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                Icons.qr_code_scanner,
                                                color: Colors.red,
                                                size: 16,
                                              ),
                                              const SizedBox(width: 10),
                                              Text(
                                                'Exit',
                                                style: GoogleFonts.poppins(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.red,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 50,)
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                    ],
                  ),

            ],
          ],
        ),
      ),
    ]);
  }
}

class uvParkingDetails extends StatefulWidget {
  final String parkeddate;
  final String parkedtime;
  final String subscriptionenddate;
  final String exitdate;
  final String exittime;
  final String userid;
  final String invoiceid;
  final String vehiclenumber;
  final String vendorname;
  final String vendorid;
  final String parkingdate;
  final String parkingtime;
  final String bookedid;
  final String schedule;
  final String bookeddate;
  final String vehicletype;
  final String status;
  final String otp;
  final String bookingtype;
  final String sts;
  final String nav;
  const uvParkingDetails({
    super.key,
    required this.bookedid,
    required this.userid,
    required this.invoiceid,
    required this.schedule,
    required this.bookeddate,
    required this.vehiclenumber,
    required this.vendorname,
    required this.vendorid,
    required this.parkingdate,
    required this.parkingtime,
    required this.vehicletype,
    required this .status,
    required this.bookingtype,
    required this.sts,
    required this.otp, required this.nav, required this.parkeddate, required this.parkedtime, required this.subscriptionenddate, required this.exitdate, required this.exittime,
  });

  @override
  _uvParkingDetailsState createState() => _uvParkingDetailsState();
}

class _uvParkingDetailsState extends State<uvParkingDetails> {
  double gstPercentage = 0.0;
  double handlingFee = 0.0;
  double totalAmountWithTaxes = 0.0;
  double payableAmount = 0.0; // To store the payable amount for the booking
  bool isLoading = false;
  bool _locationDenied = false;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  List<dynamic> charges = [];
  bool _locationPermanentlyDenied = false;
  late Position _currentPosition;
  List<String> favoriteVendorIds = [];
  List<String> amenities = []; // Add your amenities list
  List<Services> services = []; // Add your services list
  int selectedTabIndex = 0; // Track selected tab index
  double containerHeight = 500.0; // Define the containerHeight variable
  Map<String, dynamic>? _transactionDetails; // Store transaction details
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
  User? _user;
  Vendor? _vendor;
  @override
  void initState() {

    super.initState();
    _fetchTransactionDetails();
    _fetchUserData();
    _requestLocationPermission();
    fetchChargesData(widget.vendorid, widget.vehicletype);
    // Ensure vendor ID is not null before fetching amenities and parking
    if (_vendor?.id != null) {
      fetchAmenitiesAndParking(_vendor!.id).then((amenitiesAndParking) {
        setState(() {
          amenities = amenitiesAndParking
              .amenities; // Update the state with fetched amenities
          services = amenitiesAndParking
              .services; // Update the state with fetched services
        });
        // Print the amenities and services after fetching
        print('Fetched Amenities: $amenities');
        print('Fetched Services: $services');
      }).catchError((error) {
        print('Error fetching amenities: $error'); // Debugging print statement
      });
    }
    _fetchVendorData();
    if (widget.status == "PARKED") {
      fetchBookingsAndCharges();
    }
  }
  Future<void> _fetchUserData() async {
    setState(() {
      isLoading = true; // Start loading
    });

    await Future.delayed(const Duration(seconds: 2)); // Wait for 2 seconds

    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}get-userdata?id=${widget.userid}'));
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        if (data['success'] && data['data'] != null) {
          setState(() {
            _user = User.fromJson(data['data']);
            _nameController.text = _user?.username ?? '';
            _mobileNumberController.text = _user?.mobileNumber ?? '';
            // _emailController.text = _user?.email ?? '';
            // _vehicleController.text = _user?.vehicleNumber ?? '';
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
        isLoading = false; // End loading
      });
    }
  }


  Future<void> _getCurrentLocation() async {
    try {
      _currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);

      if (_vendor != null) {
        double distance = haversineDistance(
          _currentPosition.latitude,
          _currentPosition.longitude,
          double.tryParse(_vendor!.latitude) ?? 0.0,
          double.tryParse(_vendor!.longitude) ?? 0.0,
        );
        setState(() {
          _vendor!.distance = distance; // Now this will work
        });
      }
    } catch (e) {
      print('Error fetching location: $e');
    }
  }

  double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371; // Radius of the Earth in kilometers
    double dLat = _degreesToRadians(lat2 - lat1);
    double dLon = _degreesToRadians(lon2 - lon1);

    double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) *
            cos(_degreesToRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  double _degreesToRadians(double degrees) {
    return degrees * (pi / 180);
  }

  Future<AmenitiesAndParking> fetchAmenitiesAndParking(String vendorId) async {
    final url =
    Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId');

    try {
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Check if the response contains the expected structure
        if (data['AmenitiesData'] != null) {
          // Print the fetched amenities data
          print('Fetched Amenities Data: ${data['AmenitiesData']}');
          return AmenitiesAndParking.fromJson(data);
        } else {
          throw Exception('AmenitiesData is null in response');
        }
      } else {
        throw Exception('Failed to load data: ${response.statusCode}');
      }
    } catch (e) {
      print('Error: $e');
      throw Exception('Error fetching data: $e');
    }
  }

  Future<void> _requestLocationPermission() async {
    PermissionStatus status = await Permission.location.status;

    if (status.isGranted) {
      _getCurrentLocation();
    } else if (status.isDenied) {
      setState(() {
        _locationDenied = true;
      });
    } else if (status.isPermanentlyDenied) {
      setState(() {
        _locationPermanentlyDenied = true;
      });
    }
  }

  String apiUrl = '${ApiConfig.baseUrl}vendor/fetch-all-vendor-data';
  Future<Map<String, dynamic>> fetchAmountDetailsByBookingId(String bookingId) async {
    try {
      print('Fetching booking details for ID: $bookingId');

      // Fetch booking details
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}vendor/getbooking/$bookingId'),
      );

      print('API response status: ${response.statusCode}');
      print('API response body: ${response.body}');

      // Fetch GST and handling fee data
      final gstData = await fetchGstData();

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);

        print('Parsed JSON response: $jsonResponse');

        if (jsonResponse['message'] == 'Booking details fetched successfully') {
          final data = jsonResponse['data'];
          print('Extracted booking data: $data');

          final amount = data['amount'] ?? '0';
          final gst = data['gstamout'] ?? '0';
          final totalAmount = data['totalamout'] ?? '0';
          final handlingFee = gstData['handlingfee'] ?? '0'; // Fetch handling fee from gstData

          print('Amount: $amount, GST: $gst, Handling Fee: $handlingFee, Total Amount: $totalAmount');

          return {
            'amount': amount,
            'gst': gst,
            'handlingfee': handlingFee, // Include handling fee
            'totalAmount': totalAmount,
          };
        } else {
          throw Exception('Failed to fetch booking: ${jsonResponse['message']}');
        }
      } else {
        throw Exception('Failed to fetch booking: ${response.statusCode}');
      }
    } catch (e) {
      print('Exception occurred: $e');
      throw Exception('Error fetching booking details: $e');
    }
  }
  Future<void> _fetchTransactionDetails() async {
    try {
      final transactionData = await fetchAmountDetailsByBookingId(widget.bookedid);
      setState(() {
        _transactionDetails = transactionData;
      });
    } catch (e) {
      print('Error fetching transaction details: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to load transaction details. Please try again later.'),
        ),
      );
    }
  }
// Function to fetch vendor data
  Future<List<Map<String, dynamic>>> fetchVendors() async {
    setState(() {
      isLoading = true; // Set loading to true while fetching data
    });
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(Uri.parse(apiUrl));
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);

        if (jsonResponse['data'] != null) {
          return (jsonResponse['data'] as List).map((vendor) {
            double? latitude;
            double? longitude;

            // Attempt to parse latitude and longitude
            try {
              latitude = double.tryParse(
                  vendor['latitude'] ?? '0.0'); // Use '0.0' as default
              longitude = double.tryParse(
                  vendor['longitude'] ?? '0.0'); // Use '0.0' as default
            } catch (e) {
              print('Error parsing latitude/longitude: $e');
            }

            return {
              'id': vendor['_id'] ?? '',
              'name': vendor['vendorName'] ??
                  'Unknown Vendor', // Default name if null
              'latitude': latitude ?? 0.0, // Default to 0.0 if parsing fails
              'longitude': longitude ?? 0.0, // Default to 0.0 if parsing fails
              'image': vendor['image'] ?? '', // Default to empty string if null
              'address':
              vendor['address'] ?? 'No Address', // Default address if null
              'contactNo': vendor['contactNo'] ??
                  'No Contact', // Default contact if null
              'landMark': vendor['landMark'] ??
                  'No Landmark', // Default landmark if null
            };
          }).toList();
        } else {
          print('No vendor data found');
          return [];
        }
      } else {
        print('Failed to load vendors: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('Error fetching vendors: $e');
      return [];
    } finally {
      setState(() {
        isLoading = false; // Set loading to false once the data is fetched
      });
    }
  }


  Future<void> _requestPermissionAgain() async {
    PermissionStatus status = await Permission.location.request();
    if (status.isGranted) {
      _getCurrentLocation();
      setState(() {
        _locationDenied = false;
        _locationPermanentlyDenied = false;
      });
    }
  }

  Future<void> _fetchVendorData() async {
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(Uri.parse(
          '${ApiConfig.baseUrl}vendor/fetch-vendor-data?id=${widget.vendorid}'));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['data'] != null) {
          setState(() {
            _vendor = Vendor.fromJson(data['data']);
            isLoading = false; // Hide loading indicator after data is fetched
          });

          // Now that _vendor is initialized, fetch amenities and parking
          fetchAmenitiesAndParking(_vendor!.id).then((amenitiesAndParking) {
            setState(() {
              amenities = amenitiesAndParking
                  .amenities; // Update the state with fetched amenities
              services = amenitiesAndParking
                  .services; // Update the state with fetched services
            });
          }).catchError((error) {
            print(
                'Error fetching amenities: $error'); // Debugging print statement
          });
        } else {
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception(
            'Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
            Text('Failed to load vendor data. Please try again later.')),
      );
      setState(() {
        isLoading = false; // Hide loading indicator if there's an error
      });
    }
  }
  Future<Map<String, dynamic>> fetchGstData() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}vendor/getgstfee'));
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data is List && data.isNotEmpty) {
        return data[0];
      }
      return {'gst': '0', 'handlingfee': '0'};
    } else {
      throw Exception('Failed to load GST fees');
    }
  }

  Future<void> fetchChargesData(String vendorId, String selectedCarType) async {
    setState(() {
      isLoading = true; // Start loading
    });
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(
        Uri.parse(
            '${ApiConfig.baseUrl}vendor/fetchbookcharge/$vendorId/$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        // Check if the response contains the expected charges list
        if (data is List) {
          setState(() {
            charges = List<Map<String, dynamic>>.from(data);
          });
        } else if (data['vendor'] != null &&
            data['vendor']['charges'] != null) {
          setState(() {
            charges =
            List<Map<String, dynamic>>.from(data['vendor']['charges']);
          });
        } else {
          print('Charges data is missing or invalid in the response.');
          setState(() {
            charges = []; // Reset charges if data is invalid
          });
        }
      } else {
        print(
            'Failed to load charges data. Status Code: ${response.statusCode}');
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
        isLoading = false; // Stop loading
      });
    }
  }

  void calculatePayableAmount(List<dynamic> charges, String vehicleType) {
    double amount = 0.0;
    final vehicleCharges = charges
        .where((charge) => charge['category'] == vehicleType)
        .toList();

    if (vehicleCharges.isNotEmpty) {
      var monthlyCharge = vehicleCharges
          .firstWhere((charge) => charge['type'] == 'Monthly', orElse: () => {});

      if (monthlyCharge.isNotEmpty) {
        amount += double.tryParse(monthlyCharge['amount'].toString()) ?? 0.0;
      }
    }

    setState(() {
      payableAmount = amount; // Update the payableAmount directly
    });
  }
  Future<List<VehicleBooking>> fetchBookingsAndCharges() async {
    try {
      List<VehicleBooking> bookings = await fetchBookings();
      await Future.wait(
          bookings.map((booking) => fetchChargesData(booking.vendorId, booking as String))
      );
      return bookings;
    } catch (e) {
      print('Error in fetchBookingsAndCharges: $e');
      rethrow;
    }
  }
  Future<List<VehicleBooking>> fetchBookings() async {
    final String url = "${ApiConfig.baseUrl}vendor/getbookinguserid/${widget.userid}";
    print("Fetching bookings from URL: $url");

    try {
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        Map<String, dynamic> responseData = json.decode(response.body);

        if (responseData.containsKey('error')) {
          print('Error from API: ${responseData['error']}');
          return [];
        }

        if (responseData['bookings'] is List) {
          List<dynamic> data = responseData['bookings'];
          if (data.isNotEmpty) {
            return data.map((json) => VehicleBooking.fromJson(json)).toList();
          } else {
            print('No bookings found.');
            return [];
          }
        } else {
          print('Response does not contain a list of bookings: $responseData');
          return [];
        }
      } else {
        print('Failed to load booking data: ${response.statusCode} - ${response.body}');
        throw Exception('Failed to load booking data');
      }
    } catch (error) {
      print('Error fetching bookings: $error');
      throw Exception('Error fetching bookings: $error');
    }
  }

  // Calculate total amount with taxes
  double calculateTotalWithTaxes(double payableAmount) {
    final gstAmount = (payableAmount * gstPercentage) / 100;
    totalAmountWithTaxes = payableAmount + gstAmount + handlingFee;
    return totalAmountWithTaxes;
  }

  // Show exit confirmation bottom sheet
  void _showExitConfirmation() async {
    try {
      final gstData = await fetchGstData();
      setState(() {
        gstPercentage = double.tryParse(gstData['gst'].toString()) ?? 0.0;
        handlingFee = double.tryParse(gstData['handlingfee'].toString()) ?? 0.0;
      });

      final gstAmount = (payableAmount * gstPercentage) / 100;
      totalAmountWithTaxes = payableAmount + gstAmount + handlingFee;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Exit Parking",
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Base Amount:",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${payableAmount.toStringAsFixed(2)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Handling Fee:",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${handlingFee.toStringAsFixed(2)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "GST ($gstPercentage%):",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${gstAmount.toStringAsFixed(2)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Total Amount:",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    "₹${totalAmountWithTaxes.toStringAsFixed(2)}",
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: SizedBox(
                        height: 35,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context); // Close the bottom sheet
                            _navigateToPayment(); // Proceed to payment
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorUtils.primarycolor(),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: Text(
                            "Pay Now",
                            style: GoogleFonts.poppins(color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      );
    } catch (error) {
      print('Error fetching GST data: $error');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load GST and handling fee data')),
      );
    }
  }
  void _showTransactionDetailsBottomSheet() {
    if (_transactionDetails == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transaction details not available')),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              "Transaction Details",
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Base Amount:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['amount']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Handling Fee:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['handlingfee']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "GST:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['gst']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Total Amount:",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                  ),
                ),
                Text(
                  "₹${_transactionDetails!['totalAmount']}",
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 16),

          ],
        ),
      ),
    );
  }
  // Navigate to payment page
  void _navigateToPayment() {
    final gstAmount = (payableAmount * gstPercentage) / 100;
    final totalAmount = payableAmount + gstAmount + handlingFee;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => UserPayment(
          venodorname: widget.vendorname,
          vendorid: widget.vendorid,
          userid: widget.userid,
          mobilenumber:  _user?.username ?? '', // You may need to fetch this from user data
          vehicleid: widget.bookedid,
          amout: payableAmount.toString(),
          payableduration: '', // You may need to fetch or calculate this
          handlingfee: handlingFee.toString(),
          gstfee: gstAmount.toString(),
          totalamount: totalAmount.toString(),
        ),
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    return isLoading
        ? const LoadingGif() // Show loading GIF before the Scaffold
        : Scaffold(
      body: Column(
        children: [
          Expanded(
            child: _buildDetailsTab(), // This allows the tab to take available space
          ),
        ],
      ),
    );
  }

  Future<void> _generateInvoicePdf() async {
    final pdf = pw.Document();

    // Load Google Fonts for the PDF
    final font = await PdfGoogleFonts.poppinsRegular();
    final boldFont = await PdfGoogleFonts.poppinsBold();
    final logoImage = await rootBundle.load('assets/top.png');
    final logoImageBytes = logoImage.buffer.asUint8List();
    final pwImage = pw.MemoryImage(logoImageBytes);

    // Define date format for parsing widget.schedule
// Define readable date format
    final dateTimeFormat = DateFormat('dd MMM yyyy, hh:mm a');

    String fromDate = 'N/A';
    String toDate = 'N/A';

    try {
      if (widget.sts == 'Instant' || widget.sts == 'Schedule') {
        // From: Parked date + time
        fromDate = '${widget.parkeddate}, ${widget.parkedtime}';
        // To: Exit date + time
        toDate = '${widget.exitdate ?? 'N/A'}, ${widget.exittime ?? ''}';
      } else if (widget.sts == 'Subscription') {
        // From: Parked date + time
        fromDate = '${widget.parkeddate}, ${widget.parkedtime}';
        // To: Subscription end date
        toDate = widget.subscriptionenddate ?? 'N/A';
      } else {
        // Fallback if sts unknown
        fromDate = '${widget.parkeddate}, ${widget.parkedtime}';
        toDate = widget.subscriptionenddate ?? 'N/A';
      }
    } catch (e) {
      print('Date formatting error: $e');
      fromDate = 'N/A';
      toDate = 'N/A';
    }


    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'ParkMyWheels – Invoice',
                      style: pw.TextStyle(
                        font: boldFont,
                        fontSize: 14,
                        color: PdfColor.fromInt(ColorUtils.primarycolor().value),
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 5),
                    pw.Text(
                      'Smart Parking Made Easy!',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left side: Invoice Details
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Invoice No: PMW-${widget.bookedid}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Date of Issue: ${DateTime.now().toString().split(' ')[0]}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                  // Right side: Image
                  pw.Image(
                    pwImage,
                    width: 100,
                    height: 100,
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Customer Details
              pw.Text(
                'Customer Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Left side: Customer Details
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Name: ${_user?.username ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Vehicle Number: ${widget.vehiclenumber}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Vehicle Type: ${widget.vehicletype}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                  // Right side: Parking Location, Vendor, and Vendor Address
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'Parking Location',
                        style: pw.TextStyle(font: font, fontSize: 14),
                      ),
                      pw.Text(
                        '${widget.vendorname ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Address: ${_vendor?.address ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Subscription Details
              pw.Text(
                'Subscription Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Table(
                border: pw.TableBorder.all(),
                columnWidths: {
                  0: pw.FlexColumnWidth(1),
                  1: pw.FlexColumnWidth(1),
                  2: pw.FlexColumnWidth(1),
                  3: pw.FlexColumnWidth(1),
                },
                children: [
                  // Header Row
                  pw.TableRow(
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromInt(ColorUtils.primarycolor().value),
                    ),
                    children: [
                      for (var header in ['Description', 'Parked on', 'Exit on', 'Fees (₹)'])
                        pw.Padding(
                          padding: pw.EdgeInsets.all(8),
                          child: pw.Center(
                            child: pw.Text(
                              header,
                              textAlign: pw.TextAlign.center,
                              style: pw.TextStyle(
                                font: boldFont,
                                fontSize: 12,
                                color: PdfColor.fromInt(ColorUtils.whiteclr().value),
                                fontWeight: pw.FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),

                  // Data Row
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            'Monthly Parking Subscription',
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            fromDate,
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            toDate,
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(8),
                        child: pw.Center(
                          child: pw.Text(
                            _transactionDetails?['amount'] ?? '0.00',
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(font: font, fontSize: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 20),

              // Total Payable
              pw.Text(
                'Total Payable',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'Base Amount: ₹${_transactionDetails?['amount'] ?? '0.00'}',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                  // Only show Handling Fee if it's non-zero
                  if ((_transactionDetails?['handlingfee'] ?? '0') != '0' &&
                      double.tryParse(_transactionDetails?['handlingfee']?.toString() ?? '0') != 0.0)
                    pw.Text(
                      'Handling Fee: ₹${_transactionDetails?['handlingfee'] ?? '0.00'}',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  // Only show GST if it's non-zero
                  if ((_transactionDetails?['gst'] ?? '0') != '0' &&
                      double.tryParse(_transactionDetails?['gst']?.toString() ?? '0') != 0.0)
                    pw.Text(
                      'GST: ₹${_transactionDetails?['gst'] ?? '0.00'}',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  pw.Text(
                    'Total Amount (in INR): ₹${_transactionDetails?['totalAmount'] ?? '0.00'}',
                    style: pw.TextStyle(font: font, fontSize: 12, fontWeight: pw.FontWeight.bold),
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Payment Details
              pw.Text(
                'Payment Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Mode of Payment: ${_transactionDetails != null ? 'Online' : 'N/A'}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.Text(
                'Transaction ID: ${widget.bookedid}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.SizedBox(height: 20),

              // Authorized Signature
              pw.Text(
                'Authorized Signature',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Digitally signed by ParkMyWheels',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.Text(
                '(This is a computer-generated invoice and does not require a physical signature.)',
                style: pw.TextStyle(font: font, fontSize: 10),
              ),
              pw.SizedBox(height: 20),

              // Footer
              pw.Column(
                children: [
                  pw.Text(
                    'Website: www.parkmywheels.com',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                  pw.Text(
                    'Email: parkmywheels3@gmail.com',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    // Display the PDF
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
    );
  }

  Widget _buildDetailsTab() {
    return CustomScrollView(slivers: [
      SliverAppBar(
        expandedHeight: 180.0,
        pinned: true,
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_circle_left, color: Colors.white),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: Text(
          _vendor?.vendorName ?? '',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
            shadows: [
              Shadow(
                offset: const Offset(1, 1),
                blurRadius: 3,
                color: Colors.black.withOpacity(0.7),
              ),
            ],
          ),
        ),
        flexibleSpace: FlexibleSpaceBar(
          collapseMode: CollapseMode.parallax, // smooth scroll effect
          background: Stack(
            fit: StackFit.expand,
            children: [
              // --- Image Background ---
              ClipRRect(
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(15),
                  bottomRight: Radius.circular(15),
                ),
                child: Image.network(
                  _vendor?.image ?? '',
                  fit: BoxFit.cover,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Center(
                      child: LoadingAnimationWidget.halfTriangleDot(
                        color: Colors.white,
                        size: 50,
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: ColorUtils.primarycolor(),
                      child: const Center(
                        child: Icon(Icons.error, color: Colors.white, size: 40),
                      ),
                    );
                  },
                ),
              ),

              // --- Gradient Overlay (for better text contrast) ---
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.6),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      SliverToBoxAdapter(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_vendor != null) ...[

              Column(
                children: [
                  Column(
                    children: [
                      Container(
                        // color: ColorUtils.primarycolor(),
                        padding:
                        const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: ColorUtils
                              .primarycolor(), // Ensure the background color is set
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(15),
                            bottomRight: Radius.circular(15),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment
                              .start, // Aligns everything to the top
                          children: [
                            Expanded(
                              // Ensures the column takes only necessary space
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment
                                    .start, // Aligns text to the left
                                mainAxisSize: MainAxisSize
                                    .min, // Reduces extra space
                                children: [
                                  const SizedBox(height: 5),
                                  SizedBox(
                                    child: Text(
                                      _vendor?.vendorName ?? '',
                                      style: GoogleFonts.poppins(
                                        fontSize: 14,
                                        height: 1.2,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(
                                      height: 0), // Adjusted spacing
                                  Text(
                                    _vendor!.address,
                                    style: GoogleFonts.poppins(
                                        fontSize: 12,
                                        height: 1.2,
                                        color: Colors.white),
                                  ),
                                  const SizedBox(height: 5),
                                ],
                              ),
                            ),
                            Column(
                              children: [
                                const SizedBox(height: 5),
                                Padding(
                                  padding: const EdgeInsets.all(5.0),
                                  child: GestureDetector(
                                    onTap: () async {
                                      final double latitude =
                                          double.tryParse(
                                              _vendor?.latitude ??
                                                  '0') ??
                                              0.0;
                                      final double longitude =
                                          double.tryParse(
                                              _vendor?.longitude ??
                                                  '0') ??
                                              0.0;

                                      final String googleMapsUrl =
                                          'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude';

                                      if (await canLaunch(
                                          googleMapsUrl)) {
                                        await launch(googleMapsUrl);
                                      } else {
                                        debugPrint(
                                            "Could not launch $googleMapsUrl");
                                      }
                                    },
                                    child: Container(
                                      height: 20,
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 5),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius:
                                        BorderRadius.circular(3),
                                        border: Border.all(
                                            color: Colors.white,
                                            width: 1.2),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            '${_vendor?.distance != null ? _vendor!.distance?.toStringAsFixed(2) : 'N/A'} km',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Colors.black,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.telegram,
                                              size: 16.0,
                                              color: Colors.blue),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // const SizedBox(height: 5), // Reduced spacing
                    ],
                  ),
                  const SizedBox(height: 8),

                  Padding(
                    padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                    child: SizedBox(
                      height: 200,
                      child: Stack(
                        children: [
                          Positioned(
                            left: 0,
                            top: 10,
                            right: 0,
                            child: Container(
                              height: 190, // Set the appropriate height
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: const BorderRadius.only(
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
                              alignment: Alignment.bottomCenter,
                              child:  Row(
                                mainAxisAlignment:
                                MainAxisAlignment.center,
                                children: [
                                  if (widget.status != "COMPLETED" &&
                                      widget.status != "Cancelled") ...[
                                    Text(
                                      "OTP: ",
                                      style: GoogleFonts.poppins(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                        fontSize: 16,
                                      ),
                                    ),
                                    ...(widget.otp.length >= 3
                                        ? (widget.status == 'PARKED'
                                        ? widget.otp
                                        .substring(widget.otp.length - 3)
                                        .split('')
                                        .map((digit) => _pinBox(digit))
                                        : widget.otp
                                        .substring(0, 3)
                                        .split('')
                                        .map((digit) => _pinBox(digit)))
                                        : [
                                      Text(
                                        "Invalid OTP ID",
                                        style: GoogleFonts.poppins(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      )
                                    ])
                                  ],
                                  // Show "Book Again" button for completed or cancelled bookings
                                  if (widget.status == "COMPLETED" ||
                                      widget.status == "Cancelled")

                                    ElevatedButton(
                                      onPressed: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) =>
                                                ExploreBook(
                                                  vendorId: widget.vendorid,
                                                  userId: widget.userid,
                                                  vendorName:widget.vendorname,
                                                ),
                                          ),
                                        );
                                        print("Book Again pressed");
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: ColorUtils.primarycolor(),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(5),
                                        ),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 6,
                                        ),
                                        minimumSize: const Size(100, 10), // small button
                                      ),
                                      child: Text(
                                        "Book Again",
                                        style: GoogleFonts.poppins(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
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
                                      color: Colors.white,
                                      child: Align(
                                        alignment: Alignment.center, // Aligns content to the left
                                        child: Text(
                                          "Booking details",
                                          style: GoogleFonts.poppins(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            // decoration: TextDecoration.underline, // Add underline here
                                            decorationColor: Colors.black, // Optional: Set the color of the underline
                                            // Optional: Set the thickness of the underline
                                          ),
                                        ),
                                      ),
                                    ),
                                    Divider(
                                      thickness: 0.5, // Set the thickness of the divider
                                      color: ColorUtils.primarycolor(), // Set the color of the divider
                                    ),

                                    Row(
                                      mainAxisAlignment:
                                      MainAxisAlignment.start,
                                      crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                      children: [
                                        ClipPath(
                                          clipper: TicketClipper(),
                                          child: Container(
                                            padding: const EdgeInsets.all(5),
                                            decoration: const BoxDecoration(),
                                            child: Column(
                                              crossAxisAlignment:
                                              CrossAxisAlignment.center,
                                              children: [
                                                Container(
                                                  // decoration: BoxDecoration(
                                                  //   color: Colors.white,
                                                  //   borderRadius: BorderRadius.circular(16),
                                                  //   boxShadow: const [
                                                  //     BoxShadow(
                                                  //       color: Colors.black12,
                                                  //       blurRadius: 4,
                                                  //     ),
                                                  //   ],
                                                  // ),
                                                  padding:
                                                  const EdgeInsets.all(10),
                                                  child: PrettyQr(
                                                    data: widget.bookedid,
                                                    size: 100,
                                                    roundEdges: true,
                                                    errorCorrectLevel:
                                                    QrErrorCorrectLevel.H,
                                                    elementColor: Colors.black,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                        const SizedBox(
                                            width:
                                            2), // Spacing between QR and details
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                            children: [

                                              const SizedBox(
                                                  height:
                                                  13),
                                              Text(
                                                " ${widget.vehiclenumber.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 16),
                                              ),
                                              Text(
                                                "Booking date:${widget.bookeddate.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),
                                              Text(
                                                "Parking date:${widget.schedule.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),

                                              Text(
                                                "Status: ${widget.status.toString()},",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  // Text(
                                                  //   ": ${widget.sts}",
                                                  //   style: GoogleFonts.poppins(fontSize: 11),
                                                  // ),
                                                  Text(
                                                    "Booking Type: ${widget.sts == 'Subscription' ? 'Monthly' : (widget.bookingtype == '24 Hours' ? 'Full Day' : 'Hourly')}",
                                                    style: GoogleFonts.poppins(fontSize: 11),
                                                  ),
                                                ],
                                              )

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
                  ),

                  Padding(
                    padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                    child: Column(
                      children: [


                        const SizedBox(height: 15),
                        if (widget.status.toString() == "COMPLETED")
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white, // Move color inside decoration
                              borderRadius: BorderRadius.circular(5), // Set border radius
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  spreadRadius: 1,
                                  blurRadius: 2,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            // color: Colors.white,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(width: 10,),
                                Text(
                                  "Transaction details",
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Spacer(),
                                TextButton.icon(
                                  onPressed: _showTransactionDetailsBottomSheet,
                                  icon: Icon(
                                    Icons.remove_red_eye,
                                    color: ColorUtils.primarycolor(),
                                  ),
                                  label: Text(
                                    "View",
                                    style: TextStyle(
                                      color: ColorUtils.primarycolor(),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),

                              ],
                            ),
                          ),
                        const SizedBox(height: 10),
                        if (widget.status.toString() == "COMPLETED")

                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white, // Move color inside decoration
                              borderRadius: BorderRadius.circular(5), // Set border radius
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  spreadRadius: 1,
                                  blurRadius: 2,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            // color: Colors.white,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(width: 10,),
                                Text(
                                  "Invoice",
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Spacer(),
                                TextButton.icon(
                                  onPressed: _transactionDetails == null
                                      ? null
                                      : () {
                                    _generateInvoicePdf();
                                  },
                                  icon: Icon(
                                    Icons.remove_red_eye,
                                    color: ColorUtils.primarycolor(),
                                  ),
                                  label: Text(
                                    "View",
                                    style: TextStyle(
                                      color: ColorUtils.primarycolor(),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),

                              ],
                            ),
                          ),
                        const SizedBox(height: 15),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                spreadRadius: 1,
                                blurRadius: 2,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          // color: Colors.white,
                          child: Column(
                            children: [
                              const SizedBox(height: 5),
                              Container(
                                color: Colors.white,
                                child: Align(
                                  alignment: Alignment.center, // Aligns content to the left
                                  child: Text(
                                    "Price details",
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      // decoration: TextDecoration.underline, // Add underline here
                                      decorationColor: Colors.black, // Optional: Set the color of the underline
                                      // Optional: Set the thickness of the underline
                                    ),
                                  ),
                                ),
                              ),
                              Divider(
                                thickness: 0.5, // Set the thickness of the divider
                                color: ColorUtils.primarycolor(), // Set the color of the divider
                              ),
                              // const SizedBox(height: 2),
                              Container(
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white, // Move color inside decoration
                                  borderRadius: BorderRadius.circular(5), // Set border radius
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      spreadRadius: 1,
                                      blurRadius: 2,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: SingleChildScrollView(
                                    scrollDirection: Axis.horizontal, // Enable horizontal scrolling
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center, // Center items inside Row
                                      children: List.generate(charges.length, (index) {
                                        var charge = charges[index];
                                        return Row(
                                          children: [
                                            Container(
                                              width: 85, // Set width for each item
                                              padding: const EdgeInsets.symmetric(
                                                  vertical: 6, horizontal: 4), // Reduce vertical padding
                                              child: Column(
                                                mainAxisSize: MainAxisSize.min,
                                                mainAxisAlignment: MainAxisAlignment.center, // Center content vertically
                                                crossAxisAlignment: CrossAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    charge['type'],
                                                    style: GoogleFonts.poppins(
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 10,
                                                      height: 1.2, // Reduce line spacing
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                  const SizedBox(height: 1), // Reduce space between text
                                                  Text(
                                                    "₹${charge['amount']}",
                                                    style: GoogleFonts.poppins(
                                                      color: Colors.black,
                                                      fontSize: 14,
                                                      height: 1.2, // Reduce line spacing
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                ],
                                              ),
                                            ),
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
                                ),
                              ),
                            ],
                          ),
                        ),


                        const SizedBox(height: 8),
    if (amenities.isNotEmpty) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
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
                            children: [
                              const SizedBox(height: 5),
                              Container(
                                color: Colors.white,
                                child: Align(
                                  alignment: Alignment.center, // Aligns content to the left
                                  child: Text(
                                    "Facilities",
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      // decoration: TextDecoration.underline, // Add underline here
                                      decorationColor: Colors.black, // Optional: Set the color of the underline
                                      // Optional: Set the thickness of the underline
                                    ),
                                  ),
                                ),
                              ),
                              Divider(
                                thickness: 0.5, // Set the thickness of the divider
                                color: ColorUtils.primarycolor(), // Set the color of the divider
                              ),
                              //
                              Padding(
                                padding: const EdgeInsets.all(5.0),
                                child: Wrap(
                                  spacing: 6.0,
                                  runSpacing: 6.0,
                                  children: amenities.map((amenity) {
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        // color:  ColorUtils.primarycolor() ,
                                          borderRadius: BorderRadius.circular(5),
                                          border: Border.all(
                                            color: Colors.black, // Set the color of the border
                                            width: 0.5, // Set the width of the border
                                          ),
                                          boxShadow: const [
                                            // BoxShadow(
                                            //   color: Colors.black26,
                                            //   blurRadius: 4.0,
                                            //   offset: Offset(0, 2),
                                            // ),
                                          ]),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            _getAmenityIcon(amenity),
                                            size: 12,
                                            color: Colors.black,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            amenity,
                                            style: GoogleFonts.poppins(
                                              color: Colors.black,
                                              fontSize: 12,
                                              // fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                              const SizedBox(height: 5),
                            ],
                          ),
                        ),
],
                        const SizedBox(height: 8),
    if (services.isNotEmpty) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
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
                            children: [

                              Container(
                                color: Colors.white,
                                child: Align(
                                  alignment: Alignment.center, // Aligns content to the left
                                  child: Text(
                                    "Additional Services",
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      // decoration: TextDecoration.underline, // Add underline here
                                      decorationColor: Colors.black, // Optional: Set the color of the underline
                                      // Optional: Set the thickness of the underline
                                    ),
                                  ),
                                ),
                              ),
                              Divider(
                                thickness: 0.5, // Set the thickness of the divider
                                color: ColorUtils.primarycolor(), // Set the color of the divider
                              ),
                              const SizedBox(height: 8),
                              // Heading Card


                              // Loop through the services list
                              Wrap(
                                spacing: 6.0,
                                runSpacing: 6.0,
                                children: services.asMap().entries.map((entry) {
                                  final s = entry.value;

                                  return Container(
                                    // width: 100, // Adjust width as needed
                                    padding: const EdgeInsets.all(5.0),
                                    decoration: BoxDecoration(
                                      border: Border.all(color: Colors.black, width: 0.5),
                                      borderRadius: BorderRadius.circular(8.0),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          s.type,
                                          style: GoogleFonts.poppins(fontSize: 12),
                                          textAlign: TextAlign.center,
                                          softWrap: true,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          ": ₹${s.amount}",
                                          style: GoogleFonts.poppins(fontSize: 12),
                                          textAlign: TextAlign.center,
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),

                              const SizedBox(height: 8),
                            ],
                          ),
                        ),
],
                        // Add more widgets as needed
                        // Google Map
                        const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            // color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                spreadRadius: 1,
                                blurRadius: 2,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          // color: Colors.white,
                          child: Column(
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    vertical: 5),
                                child: Container(
                                  width: double.infinity,
                                  height: 150,
                                  decoration: BoxDecoration(
                                    // border:
                                    //     Border.all(color: Colors.grey),
                                    borderRadius:
                                    BorderRadius.circular(5.0),
                                  ),
                                  child: ClipRRect(
                                    borderRadius:
                                    BorderRadius.circular(5.0),
                                    child: GoogleMap(
                                      initialCameraPosition:
                                      CameraPosition(
                                        target: LatLng(
                                          double.tryParse(
                                              _vendor?.latitude ??
                                                  '0') ??
                                              0.0, // Convert latitude to double
                                          double.tryParse(
                                              _vendor?.longitude ??
                                                  '0') ??
                                              0.0,
                                        ),
                                        zoom: 15,
                                      ),
                                      markers: {
                                        Marker(
                                          markerId: const MarkerId(
                                              'vendor_location'),
                                          position: LatLng(
                                            double.tryParse(
                                                _vendor?.latitude ??
                                                    '0') ??
                                                0.0, // Convert latitude to double
                                            double.tryParse(
                                                _vendor?.longitude ??
                                                    '0') ??
                                                0.0,
                                          ),
                                        ),
                                      },
                                    ),
                                  ),
                                ),
                              ),

                              if (widget.status.toString() == "PARKED" && widget.nav == "monthly")
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: payableAmount == 0.0
                                      ? SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                          ColorUtils.primarycolor()),
                                    ),
                                  )
                                      : SizedBox(
                                    height: 30,
                                    child: ElevatedButton(
                                      onPressed: () {
                                        _showExitConfirmation();
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: Colors.red,
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 5),
                                        minimumSize: const Size(0, 0),
                                        shape: const RoundedRectangleBorder(
                                          borderRadius:
                                          BorderRadius.all(Radius.circular(5)),
                                          side: BorderSide(
                                            color: Colors.red,
                                            width: 0.5,
                                          ),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            Icons.qr_code_scanner,
                                            color: Colors.red,
                                            size: 16,
                                          ),
                                          const SizedBox(width: 10),
                                          Text(
                                            'Exit',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.red,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              // const SizedBox(height: 100,)
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                ],
              ),

            ],
          ],
        ),
      ),
    ]);
  }
}






class vendorParkingDetails extends StatefulWidget {
  final String vehiclenumber;
  final String invoiceid;
  final String vendorname;
  final String vendorid;
  final String parkingdate;
  final String parkingtime;
  final String bookedid;
  final String schedule;
  final String bookeddate;
  final String vehicletype;
  final String status;
  final String otp;
  final String bookingtype;
  final String sts;
  final String mobilenumber;
  final String username;
  final String invoice;
  final String amount;
  final String totalamount;
  final String parkeddate;
  final String parkedtime;
  final String subscriptionenddate;
  final String exitdate;
  final String exittime;


  const vendorParkingDetails({
    super.key,
    required this.invoiceid,
    required this.username,
    required this.bookedid,
    required this.schedule,
    required this.amount,
    required this.totalamount,
    required this.bookeddate,
    required this.vehiclenumber,
    required this.vendorname,
    required this.vendorid,
    required this.parkingdate,
    required this.parkingtime,
    required this.invoice,
    required this.vehicletype,
    required this .status,
    required this.bookingtype,
    required this.sts,
    required this.otp,
    required this.mobilenumber, required this.parkeddate, required this.parkedtime, required this.subscriptionenddate, required this.exitdate, required this.exittime,
  });

  @override
  _vParkingDetailsState createState() => _vParkingDetailsState();
}

class _vParkingDetailsState extends State<vendorParkingDetails> {

  bool isLoading = false;
  bool _locationDenied = false;
  List<dynamic> charges = [];
  bool _locationPermanentlyDenied = false;
  late Position _currentPosition;
  List<String> favoriteVendorIds = [];
  List<String> amenities = []; // Add your amenities list
  List<Services> services = []; // Add your services list
  int selectedTabIndex = 0; // Track selected tab index
  double containerHeight = 500.0; // Define the containerHeight variable

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

  Vendor? _vendor;
  @override
  void initState() {
    super.initState();
    _requestLocationPermission();
    fetchChargesData(widget.vendorid, widget.vehicletype);
    // Ensure vendor ID is not null before fetching amenities and parking
    if (_vendor?.id != null) {
      fetchAmenitiesAndParking(_vendor!.id).then((amenitiesAndParking) {
        setState(() {
          amenities = amenitiesAndParking
              .amenities; // Update the state with fetched amenities
          services = amenitiesAndParking
              .services; // Update the state with fetched services
        });
        // Print the amenities and services after fetching
        print('Fetched Amenities: $amenities');
        print('Fetched Services: $services');
      }).catchError((error) {
        print('Error fetching amenities: $error'); // Debugging print statement
      });
    }
    _fetchVendorData();
  }

  Future<void> fetchChargesData(String vendorId, String selectedCarType) async {
    setState(() {
      isLoading = true; // Start loading
    });
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(
        Uri.parse(
            '${ApiConfig.baseUrl}vendor/fetchbookcharge/$vendorId/$selectedCarType'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response Data: $data');

        // Check if the response contains the expected charges list
        if (data is List) {
          setState(() {
            charges = List<Map<String, dynamic>>.from(data);
          });
        } else if (data['vendor'] != null &&
            data['vendor']['charges'] != null) {
          setState(() {
            charges =
            List<Map<String, dynamic>>.from(data['vendor']['charges']);
          });
        } else {
          print('Charges data is missing or invalid in the response.');
          setState(() {
            charges = []; // Reset charges if data is invalid
          });
        }
      } else {
        print(
            'Failed to load charges data. Status Code: ${response.statusCode}');
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
        isLoading = false; // Stop loading
      });
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      _currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);

      if (_vendor != null) {
        double distance = haversineDistance(
          _currentPosition.latitude,
          _currentPosition.longitude,
          double.tryParse(_vendor!.latitude) ?? 0.0,
          double.tryParse(_vendor!.longitude) ?? 0.0,
        );
        setState(() {
          _vendor!.distance = distance; // Now this will work
        });
      }
    } catch (e) {
      print('Error fetching location: $e');
    }
  }

  double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371; // Radius of the Earth in kilometers
    double dLat = _degreesToRadians(lat2 - lat1);
    double dLon = _degreesToRadians(lon2 - lon1);

    double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) *
            cos(_degreesToRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  double _degreesToRadians(double degrees) {
    return degrees * (pi / 180);
  }

  Future<AmenitiesAndParking> fetchAmenitiesAndParking(String vendorId) async {
    final url =
    Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId');

    try {
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Check if the response contains the expected structure
        if (data['AmenitiesData'] != null) {
          // Print the fetched amenities data
          print('Fetched Amenities Data: ${data['AmenitiesData']}');
          return AmenitiesAndParking.fromJson(data);
        } else {
          throw Exception('AmenitiesData is null in response');
        }
      } else {
        throw Exception('Failed to load data: ${response.statusCode}');
      }
    } catch (e) {
      print('Error: $e');
      throw Exception('Error fetching data: $e');
    }
  }

  Future<void> _requestLocationPermission() async {
    PermissionStatus status = await Permission.location.status;

    if (status.isGranted) {
      _getCurrentLocation();
    } else if (status.isDenied) {
      setState(() {
        _locationDenied = true;
      });
    } else if (status.isPermanentlyDenied) {
      setState(() {
        _locationPermanentlyDenied = true;
      });
    }
  }

  String apiUrl = '${ApiConfig.baseUrl}vendor/fetch-all-vendor-data';

// Function to fetch vendor data
  Future<List<Map<String, dynamic>>> fetchVendors() async {
    setState(() {
      isLoading = true; // Set loading to true while fetching data
    });
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(Uri.parse(apiUrl));
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);

        if (jsonResponse['data'] != null) {
          return (jsonResponse['data'] as List).map((vendor) {
            double? latitude;
            double? longitude;

            // Attempt to parse latitude and longitude
            try {
              latitude = double.tryParse(
                  vendor['latitude'] ?? '0.0'); // Use '0.0' as default
              longitude = double.tryParse(
                  vendor['longitude'] ?? '0.0'); // Use '0.0' as default
            } catch (e) {
              print('Error parsing latitude/longitude: $e');
            }

            return {
              'id': vendor['_id'] ?? '',
              'name': vendor['vendorName'] ??
                  'Unknown Vendor', // Default name if null
              'latitude': latitude ?? 0.0, // Default to 0.0 if parsing fails
              'longitude': longitude ?? 0.0, // Default to 0.0 if parsing fails
              'image': vendor['image'] ?? '', // Default to empty string if null
              'address':
              vendor['address'] ?? 'No Address', // Default address if null
              'contactNo': vendor['contactNo'] ??
                  'No Contact', // Default contact if null
              'landMark': vendor['landMark'] ??
                  'No Landmark', // Default landmark if null
            };
          }).toList();
        } else {
          print('No vendor data found');
          return [];
        }
      } else {
        print('Failed to load vendors: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('Error fetching vendors: $e');
      return [];
    } finally {
      setState(() {
        isLoading = false; // Set loading to false once the data is fetched
      });
    }
  }

  // Future<void> _getCurrentLocation() async {
  //   try {
  //     _currentPosition = await Geolocator.getCurrentPosition(
  //         desiredAccuracy: LocationAccuracy.high);
  //     setState(() {
  //       // Update the map with the current position
  //     });
  //   } catch (e) {
  //     print('Error fetching location: $e');
  //   }
  // }


  Future<void> _generateInvoicePdf() async {
    final pdf = pw.Document();

    // Load Google Fonts for the PDF
    final font = await PdfGoogleFonts.poppinsRegular();
    final boldFont = await PdfGoogleFonts.poppinsBold();
    final logoImage = await rootBundle.load('assets/top.png');
    final logoImageBytes = logoImage.buffer.asUint8List();
    final pwImage = pw.MemoryImage(logoImageBytes);

    // Helper function to get display-friendly booking type
    String getBookingTypeDisplay() {
      if (widget.sts == null || widget.sts.isEmpty) return 'N/A';
      if (widget.bookingtype == '24 Hours') return 'Full Day';
      return widget.sts; // always show sts value
    }


    // Define date format for parsing widget.schedule
    // Define readable date format
    final dateTimeFormat = DateFormat('dd MMM yyyy, hh:mm a');

    String fromDate = 'N/A';
    String toDate = 'N/A';

    try {
      if (widget.sts == 'Instant' || widget.sts == 'Schedule') {
        // From: Parked date + time
        fromDate = '${widget.parkeddate}, ${widget.parkedtime}';
        // To: Exit date + time
        toDate = '${widget.exitdate ?? 'N/A'}, ${widget.exittime ?? ''}';
      } else if (widget.sts == 'Subscription') {
        // From: Parked date + time
        fromDate = '${widget.parkeddate}, ${widget.parkedtime}';
        // To: Subscription end date
        toDate = widget.subscriptionenddate ?? 'N/A';
      } else {
        // Fallback if sts unknown
        fromDate = '${widget.parkeddate}, ${widget.parkedtime}';
        toDate = widget.subscriptionenddate ?? 'N/A';
      }
    } catch (e) {
      print('Date formatting error: $e');
      fromDate = 'N/A';
      toDate = 'N/A';
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'ParkMyWheels – Parking Invoice',
                      style: pw.TextStyle(
                        font: boldFont,
                        fontSize: 14,
                        color: PdfColor.fromInt(ColorUtils.primarycolor().value),
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 5),
                    pw.Text(
                      'Smart Parking Made Easy!',
                      style: pw.TextStyle(font: font, fontSize: 12),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left side: Invoice Details
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Invoice No: ${widget.invoiceid}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Date of Issue: ${DateTime.now().toString().split(' ')[0]}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                  // Right side: Image
                  pw.Image(
                    pwImage,
                    width: 100,
                    height: 100,
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Customer Details
              pw.Text(
                'Customer Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Left side: Customer Details
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Name: ${widget.username ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Vehicle Number: ${widget.vehiclenumber}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Vehicle Type: ${widget.vehicletype}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                  // Right side: Parking Location, Vendor, and Vendor Address
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'Parking Location',
                        style: pw.TextStyle(font: font, fontSize: 14),
                      ),
                      pw.Text(
                        '${widget.vendorname ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                      pw.Text(
                        'Address: ${_vendor?.address ?? 'N/A'}',
                        style: pw.TextStyle(font: font, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Subscription Details
              pw.Text(
                'Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Table(
                border: pw.TableBorder.all(),
                columnWidths: {
                  0: pw.FlexColumnWidth(1),
                  1: pw.FlexColumnWidth(1),
                  2: pw.FlexColumnWidth(1),
                  3: pw.FlexColumnWidth(1),
                },
                children: [
                  // Header Row
                  pw.TableRow(
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromInt(ColorUtils.primarycolor().value),
                    ),
                    children: [
                      for (var header in ['Description', 'Parked on', 'Exit on', 'Fees (₹)'])
                        pw.Padding(
                          padding: pw.EdgeInsets.all(8),
                          child: pw.Center(
                            child: pw.Text(
                              header,
                              style: pw.TextStyle(
                                font: boldFont,
                                fontSize: 12,
                                color: PdfColor.fromInt(ColorUtils.whiteclr().value),
                                fontWeight: pw.FontWeight.bold,
                              ),
                              textAlign: pw.TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),

                  // Data Row
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: pw.EdgeInsets.all(4),
                        child: pw.Center(
                          child: pw.Text(
                            getBookingTypeDisplay(),
                            style: pw.TextStyle(font: font, fontSize: 10),
                            textAlign: pw.TextAlign.center,
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(4),
                        child: pw.Center(
                          child: pw.Text(
                            fromDate,
                            style: pw.TextStyle(font: font, fontSize: 10),
                            textAlign: pw.TextAlign.center,
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(4),
                        child: pw.Center(
                          child: pw.Text(
                            toDate,
                            style: pw.TextStyle(font: font, fontSize: 10),
                            textAlign: pw.TextAlign.center,
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: pw.EdgeInsets.all(4),
                        child: pw.Center(
                          child: pw.Text(
                            widget.amount,
                            style: pw.TextStyle(font: font, fontSize: 10),
                            textAlign: pw.TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 20),

              // Total Payable
              pw.Text(
                'Total Payable',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Amount (in INR): ₹ ${widget.totalamount}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),

              pw.SizedBox(height: 20),

              // Payment Details
              pw.Text(
                'Payment Details',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Mode of Payment: ${widget.invoice != null ? 'Online' : 'Cash'}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),

              pw.Text(
                'Transaction ID: ${widget.invoice}',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.SizedBox(height: 20),

              // Authorized Signature
              pw.Text(
                'Authorized Signature',
                style: pw.TextStyle(font: boldFont, fontSize: 16, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Digitally signed by ParkMyWheels',
                style: pw.TextStyle(font: font, fontSize: 12),
              ),
              pw.Text(
                '(This is a computer-generated invoice and does not require a physical signature.)',
                style: pw.TextStyle(font: font, fontSize: 10),
              ),
              pw.SizedBox(height: 20),

              // Footer
              pw.Column(
                children: [
                  pw.Text(
                    'Website: www.parkmywheels.com',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                  pw.Text(
                    'Email: parkmywheels3@gmail.com',
                    style: pw.TextStyle(font: font, fontSize: 12),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    // Display the PDF
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
    );
  }

  Future<void> _fetchVendorData() async {
    await Future.delayed(const Duration(seconds: 2));
    try {
      final response = await http.get(Uri.parse(
          '${ApiConfig.baseUrl}vendor/fetch-vendor-data?id=${widget.vendorid}'));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data['data'] != null) {
          setState(() {
            _vendor = Vendor.fromJson(data['data']);
            isLoading = false; // Hide loading indicator after data is fetched
          });

          // Now that _vendor is initialized, fetch amenities and parking
          fetchAmenitiesAndParking(_vendor!.id).then((amenitiesAndParking) {
            setState(() {
              amenities = amenitiesAndParking
                  .amenities; // Update the state with fetched amenities
              services = amenitiesAndParking
                  .services; // Update the state with fetched services
            });
          }).catchError((error) {
            print(
                'Error fetching amenities: $error'); // Debugging print statement
          });
        } else {
          throw Exception(data['message'] ?? 'Unknown error occurred');
        }
      } else {
        throw Exception(
            'Failed to load vendor data, status code: ${response.statusCode}');
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
            Text('Failed to load vendor data. Please try again later.')),
      );
      setState(() {
        isLoading = false; // Hide loading indicator if there's an error
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return isLoading
        ? const LoadingGif() // Show loading GIF before the Scaffold
        :Scaffold(
      body: Column(
        children: [
          Expanded(
            child: _buildDetailsTab(), // This allows the tab to take available space
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsTab() {
    return CustomScrollView(slivers: [
      SliverAppBar(
        expandedHeight: 180.0,
        pinned: true,
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_circle_left, color: Colors.white),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: Text(
          _vendor?.vendorName ?? '',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
            shadows: [
              Shadow(
                offset: const Offset(1, 1),
                blurRadius: 3,
                color: Colors.black.withOpacity(0.7),
              ),
            ],
          ),
        ),
        flexibleSpace: FlexibleSpaceBar(
          collapseMode: CollapseMode.parallax, // smooth scroll effect
          background: Stack(
            fit: StackFit.expand,
            children: [
              // --- Image Background ---
              ClipRRect(
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(15),
                  bottomRight: Radius.circular(15),
                ),
                child: Image.network(
                  _vendor?.image ?? '',
                  fit: BoxFit.cover,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Center(
                      child: LoadingAnimationWidget.halfTriangleDot(
                        color: Colors.white,
                        size: 50,
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: ColorUtils.primarycolor(),
                      child: const Center(
                        child: Icon(Icons.error, color: Colors.white, size: 40),
                      ),
                    );
                  },
                ),
              ),

              // --- Gradient Overlay (for better text contrast) ---
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.6),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      SliverToBoxAdapter(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_vendor != null) ...[

              Column(
                children: [
                  Column(
                    children: [
                      Container(
                        // color: ColorUtils.primarycolor(),
                        padding:
                        const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: ColorUtils
                              .primarycolor(), // Ensure the background color is set
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(15),
                            bottomRight: Radius.circular(15),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment
                              .start, // Aligns everything to the top
                          children: [
                            Expanded(
                              // Ensures the column takes only necessary space
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment
                                    .start, // Aligns text to the left
                                mainAxisSize: MainAxisSize
                                    .min, // Reduces extra space
                                children: [
                                  const SizedBox(height: 5),
                                  SizedBox(
                                    child: Text(
                                      _vendor?.vendorName ?? '',
                                      style: GoogleFonts.poppins(
                                        fontSize: 14,
                                        height: 1.2,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(
                                      height: 0), // Adjusted spacing
                                  Text(
                                    _vendor!.address,
                                    style: GoogleFonts.poppins(
                                        fontSize: 12,
                                        height: 1.2,
                                        color: Colors.white),
                                  ),
                                  const SizedBox(height: 5),
                                ],
                              ),
                            ),
                            Column(
                              children: [
                                const SizedBox(height: 5),
                                Padding(
                                  padding: const EdgeInsets.all(5.0),
                                  child: GestureDetector(
                                    onTap: () async {
                                      final double latitude =
                                          double.tryParse(
                                              _vendor?.latitude ??
                                                  '0') ??
                                              0.0;
                                      final double longitude =
                                          double.tryParse(
                                              _vendor?.longitude ??
                                                  '0') ??
                                              0.0;

                                      final String googleMapsUrl =
                                          'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude';

                                      if (await canLaunch(
                                          googleMapsUrl)) {
                                        await launch(googleMapsUrl);
                                      } else {
                                        debugPrint(
                                            "Could not launch $googleMapsUrl");
                                      }
                                    },
                                    child: Container(
                                      height: 20,
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 5),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius:
                                        BorderRadius.circular(3),
                                        border: Border.all(
                                            color: Colors.white,
                                            width: 1.2),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            '${_vendor?.distance != null ? _vendor!.distance?.toStringAsFixed(2) : 'N/A'} km',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Colors.black,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.telegram,
                                              size: 16.0,
                                              color: Colors.blue),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // const SizedBox(height: 5), // Reduced spacing
                    ],
                  ),
                  const SizedBox(height: 8),

                  Padding(
                    padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                    child: SizedBox(
                      height: 200,
                      child: Stack(
                        children: [
                          Positioned(
                            left: 0,
                            top: 10,
                            right: 0,
                            child: Container(
                              height: 190, // Set the appropriate height
                              decoration: BoxDecoration(
                                color: ColorUtils.primarycolor(),
                                borderRadius: const BorderRadius.only(
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
                              alignment: Alignment.bottomCenter,
                              child:  const Row(
                                mainAxisAlignment:
                                MainAxisAlignment.center,
                                children: [
                    


                                ],
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
                                      color: Colors.white,
                                      child: Align(
                                        alignment: Alignment.center, // Aligns content to the left
                                        child: Text(
                                          "Booking details",
                                          style: GoogleFonts.poppins(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            // decoration: TextDecoration.underline, // Add underline here
                                            decorationColor: Colors.black, // Optional: Set the color of the underline
                                            // Optional: Set the thickness of the underline
                                          ),
                                        ),
                                      ),
                                    ),
                                    Divider(
                                      thickness: 0.5, // Set the thickness of the divider
                                      color: ColorUtils.primarycolor(), // Set the color of the divider
                                    ),
                                    // Container(
                                    // padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                                    // decoration: BoxDecoration(
                                    // border: Border(
                                    // bottom: BorderSide(
                                    // color: ColorUtils.primarycolor(), // Replace with ColorUtils.primarycolor()
                                    // width: 0.5,
                                    // ),
                                    // ),
                                    // borderRadius: const BorderRadius.only(
                                    // topLeft: Radius.circular(5.0),
                                    // topRight: Radius.circular(5.0),
                                    // ),
                                    // ),
                                    // child: Row(
                                    // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    // children: [
                                    //   Padding(
                                    //     padding: const EdgeInsets.only(right: 12.0),
                                    //     child: Text(
                                    //       widget.vehiclenumber,
                                    //       style: GoogleFonts.poppins(
                                    //         color:ColorUtils.primarycolor(),
                                    //         fontWeight: FontWeight.bold,
                                    //       ),
                                    //     ),
                                    //   ),
                                    // const Spacer(),
                                    // Padding(
                                    // padding: const EdgeInsets.only(right: 12.0),
                                    // child: Text(
                                    // widget.status,
                                    // style: GoogleFonts.poppins(
                                    // color:ColorUtils.primarycolor(),
                                    // fontWeight: FontWeight.bold,
                                    // ),
                                    // ),
                                    // ),
                                    //
                                    // ],
                                    // ),
                                    // ),
                                    Row(
                                      mainAxisAlignment:
                                      MainAxisAlignment.start,
                                      crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                      children: [
                                        ClipPath(
                                          clipper: TicketClipper(),
                                          child: Container(
                                            padding: const EdgeInsets.all(5),
                                            decoration: const BoxDecoration(),
                                            child: Column(
                                              crossAxisAlignment:
                                              CrossAxisAlignment.center,
                                              children: [
                                                Container(
                                                  // decoration: BoxDecoration(
                                                  //   color: Colors.white,
                                                  //   borderRadius: BorderRadius.circular(16),
                                                  //   boxShadow: const [
                                                  //     BoxShadow(
                                                  //       color: Colors.black12,
                                                  //       blurRadius: 4,
                                                  //     ),
                                                  //   ],
                                                  // ),
                                                  padding:
                                                  const EdgeInsets.all(10),
                                                  child: PrettyQr(
                                                    data: widget.vehiclenumber,
                                                    size: 100,
                                                    roundEdges: true,
                                                    errorCorrectLevel:
                                                    QrErrorCorrectLevel.H,
                                                    elementColor: Colors.black,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                        const SizedBox(
                                            width:
                                            2), // Spacing between QR and details
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                            children: [

                                              const SizedBox(
                                                  height:
                                                  13),
                                              Text(
                                                " ${widget.vehiclenumber.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 16),
                                              ),
                                              Text(
                                                "Booking date:${widget.bookeddate.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),
                                              Text(
                                                "Parking date:${widget.schedule.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),

                                              Text(
                                                "Status: ${widget.status.toString()},",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),
                                              Text(
                                                "Mobilenumber: ${widget.mobilenumber.toString()}",
                                                style: GoogleFonts.poppins(fontSize: 11),
                                              ),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  // Text(
                                                  //   ": ${widget.sts}",
                                                  //   style: GoogleFonts.poppins(fontSize: 11),
                                                  // ),
                                                  Text(
                                                    "Booking Type: ${widget.sts == 'Subscription' ? 'Monthly' : (widget.bookingtype == '24 Hours' ? 'Full Day' : 'Hourly')}",
                                                    style: GoogleFonts.poppins(fontSize: 11),
                                                  ),
                                                ],
                                              )

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
                  ),

                  Padding(
                    padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                    child: Column(
                      children: [


                        const SizedBox(height: 15),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                spreadRadius: 1,
                                blurRadius: 2,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          // color: Colors.white,
                          child: Column(
                            children: [
                              const SizedBox(height: 5),
                              Container(
                                color: Colors.white,
                                child: Align(
                                  alignment: Alignment.center, // Aligns content to the left
                                  child: Text(
                                    "Price details",
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      // decoration: TextDecoration.underline, // Add underline here
                                      decorationColor: Colors.black, // Optional: Set the color of the underline
                                      // Optional: Set the thickness of the underline
                                    ),
                                  ),
                                ),
                              ),
                              Divider(
                                thickness: 0.5, // Set the thickness of the divider
                                color: ColorUtils.primarycolor(), // Set the color of the divider
                              ),
                              // const SizedBox(height: 2),
                              Container(
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white, // Move color inside decoration
                                  borderRadius: BorderRadius.circular(5), // Set border radius
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      spreadRadius: 1,
                                      blurRadius: 2,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: SingleChildScrollView(
                                    scrollDirection: Axis.horizontal, // Enable horizontal scrolling
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center, // Center items inside Row
                                      children: List.generate(charges.length, (index) {
                                        var charge = charges[index];
                                        return Row(
                                          children: [
                                            Container(
                                              width: 85, // Set width for each item
                                              padding: const EdgeInsets.symmetric(
                                                  vertical: 6, horizontal: 4), // Reduce vertical padding
                                              child: Column(
                                                mainAxisSize: MainAxisSize.min,
                                                mainAxisAlignment: MainAxisAlignment.center, // Center content vertically
                                                crossAxisAlignment: CrossAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    charge['type'],
                                                    style: GoogleFonts.poppins(
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 10,
                                                      height: 1.2, // Reduce line spacing
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                  const SizedBox(height: 1), // Reduce space between text
                                                  Text(
                                                    "₹${charge['amount']}",
                                                    style: GoogleFonts.poppins(
                                                      color: Colors.black,
                                                      fontSize: 14,
                                                      height: 1.2, // Reduce line spacing
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                ],
                                              ),
                                            ),
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
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        // if (widget.status.toString() == "COMPLETED")

                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white, // Move color inside decoration
                              borderRadius: BorderRadius.circular(5), // Set border radius
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  spreadRadius: 1,
                                  blurRadius: 2,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            // color: Colors.white,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(width: 10,),
                                Text(
                                  "Invoice",
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Spacer(),
                                TextButton.icon(
                                  onPressed: _generateInvoicePdf, // <-- no ()
                                  icon: Icon(
                                    Icons.remove_red_eye,
                                    color: ColorUtils.primarycolor(),
                                  ),
                                  label: Text(
                                    "View",
                                    style: TextStyle(
                                      color: ColorUtils.primarycolor(),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),


                              ],
                            ),
                          ),
                        const SizedBox(height: 8),
    if (amenities.isNotEmpty) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
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
                            children: [
                              const SizedBox(height: 5),
                              Container(
                                color: Colors.white,
                                child: Align(
                                  alignment: Alignment.center, // Aligns content to the left
                                  child: Text(
                                    "Facilities",
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      // decoration: TextDecoration.underline, // Add underline here
                                      decorationColor: Colors.black, // Optional: Set the color of the underline
                                      // Optional: Set the thickness of the underline
                                    ),
                                  ),
                                ),
                              ),
                              Divider(
                                thickness: 0.5, // Set the thickness of the divider
                                color: ColorUtils.primarycolor(), // Set the color of the divider
                              ),
                              //
                              Padding(
                                padding: const EdgeInsets.all(5.0),
                                child: Wrap(
                                  spacing: 6.0,
                                  runSpacing: 6.0,
                                  children: amenities.map((amenity) {
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        // color:  ColorUtils.primarycolor() ,
                                          borderRadius: BorderRadius.circular(5),
                                          border: Border.all(
                                            color: Colors.black, // Set the color of the border
                                            width: 0.5, // Set the width of the border
                                          ),
                                          boxShadow: const [
                                            // BoxShadow(
                                            //   color: Colors.black26,
                                            //   blurRadius: 4.0,
                                            //   offset: Offset(0, 2),
                                            // ),
                                          ]),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            _getAmenityIcon(amenity),
                                            size: 12,
                                            color: Colors.black,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            amenity,
                                            style: GoogleFonts.poppins(
                                              color: Colors.black,
                                              fontSize: 12,
                                              // fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                              const SizedBox(height: 5),
                            ],
                          ),
                        ),
],
                        const SizedBox(height: 8),
    if (services.isNotEmpty) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
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
                            children: [

                              Container(
                                color: Colors.white,
                                child: Align(
                                  alignment: Alignment.center, // Aligns content to the left
                                  child: Text(
                                    "Additional Services",
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      // decoration: TextDecoration.underline, // Add underline here
                                      decorationColor: Colors.black, // Optional: Set the color of the underline
                                      // Optional: Set the thickness of the underline
                                    ),
                                  ),
                                ),
                              ),
                              Divider(
                                thickness: 0.5, // Set the thickness of the divider
                                color: ColorUtils.primarycolor(), // Set the color of the divider
                              ),
                              const SizedBox(height: 8),
                              // Heading Card


                              // Loop through the services list
                              Wrap(
                                spacing: 6.0,
                                runSpacing: 6.0,
                                children: services.asMap().entries.map((entry) {
                                  final s = entry.value;

                                  return Container(
                                    // width: 100, // Adjust width as needed
                                    padding: const EdgeInsets.all(5.0),
                                    decoration: BoxDecoration(
                                      border: Border.all(color: Colors.black, width: 0.5),
                                      borderRadius: BorderRadius.circular(8.0),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          s.type,
                                          style: GoogleFonts.poppins(fontSize: 12),
                                          textAlign: TextAlign.center,
                                          softWrap: true,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          ": ₹${s.amount}",
                                          style: GoogleFonts.poppins(fontSize: 12),
                                          textAlign: TextAlign.center,
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),

                              const SizedBox(height: 8),
                            ],
                          ),
                        ),
],
                        // Add more widgets as needed
                        // Google Map
                        const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            // color: Colors.white, // Move color inside decoration
                            borderRadius: BorderRadius.circular(5), // Set border radius
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                spreadRadius: 1,
                                blurRadius: 2,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          // color: Colors.white,
                          child: Column(
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    vertical: 5),
                                child: Container(
                                  width: double.infinity,
                                  height: 150,
                                  decoration: BoxDecoration(
                                    // border:
                                    //     Border.all(color: Colors.grey),
                                    borderRadius:
                                    BorderRadius.circular(5.0),
                                  ),
                                  child: ClipRRect(
                                    borderRadius:
                                    BorderRadius.circular(5.0),
                                    child: GoogleMap(
                                      initialCameraPosition:
                                      CameraPosition(
                                        target: LatLng(
                                          double.tryParse(
                                              _vendor?.latitude ??
                                                  '0') ??
                                              0.0, // Convert latitude to double
                                          double.tryParse(
                                              _vendor?.longitude ??
                                                  '0') ??
                                              0.0,
                                        ),
                                        zoom: 15,
                                      ),
                                      markers: {
                                        Marker(
                                          markerId: const MarkerId(
                                              'vendor_location'),
                                          position: LatLng(
                                            double.tryParse(
                                                _vendor?.latitude ??
                                                    '0') ??
                                                0.0, // Convert latitude to double
                                            double.tryParse(
                                                _vendor?.longitude ??
                                                    '0') ??
                                                0.0,
                                          ),
                                        ),
                                      },
                                    ),
                                  ),
                                ),
                              ),

                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

            ],
          ],
        ),
      ),
    ]);
  }

}

Widget _buildDetailRow(String label, String value) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      Text(
        value,
        style: GoogleFonts.poppins(
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
    ],
  );
}

Widget _pinBox(String number) {
  return Container(
    height: 20, // Adjust height for better visibility
    width: 20, // Adjust width for better visibility
    margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: Colors.black, width: 0.5),// White background
      borderRadius: BorderRadius.circular(5), // Rounded corners
      boxShadow: [
        BoxShadow(

          color: Colors.black.withOpacity(0.1), // Shadow color
          blurRadius: 4, // Shadow blur radius
          offset: const Offset(0, 2), // Shadow offset
        ),
      ],
    ),
    alignment: Alignment.center, // Center the text within the box
    child: Text(
      number,
      style: GoogleFonts.poppins(
        fontSize: 12,
        height: 1.0,// Increased font size for better visibility
        color: Colors.black, // Black text color for contrast
        fontWeight: FontWeight.bold,
      ),
    ),
  );
}

class TicketClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    double cutoutRadius = 20.0;
    Path path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height - cutoutRadius)
      ..arcToPoint(
        Offset(size.width - cutoutRadius, size.height),
        radius: Radius.circular(cutoutRadius),
        clockwise: false,
      )
      ..lineTo(cutoutRadius, size.height)
      ..arcToPoint(
        Offset(0, size.height - cutoutRadius),
        radius: Radius.circular(cutoutRadius),
        clockwise: false,
      )
      ..close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}

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
      description: json['description'] ??
          '', // Provide a default value if description is null
    );
  }
}

// Function to fetch amenities and parking services
Future<AmenitiesAndParking> fetchAmenitiesAndParking(String vendorId) async {
  final url =
      Uri.parse('${ApiConfig.baseUrl}vendor/getamenitiesdata/$vendorId');

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
        json['AmenitiesData']['amenities']
            .map((item) => item.toString()), // Convert to List<String>
      ),
      services: List<Services>.from(
        json['AmenitiesData']['parkingEntries']
            .map((item) => Services.fromJson(item)),
      ),
    );
  }
}
// Define your Services class here

class ParkingCharge {
  final String type;
  final String amount;

  ParkingCharge({required this.type, required this.amount});

  factory ParkingCharge.fromJson(Map<String, dynamic> json) {
    return ParkingCharge(
      type: json['type'],
      amount: json['amount'],
    );
  }
}
