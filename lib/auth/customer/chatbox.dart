import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mywheels/auth/customer/parking/bookparking.dart';
import '../../config/colorcode.dart';
import 'drawer/Searchscreen.dart';

class ChatScreen extends StatefulWidget {
  final String userid;
  const ChatScreen({super.key, required this.userid});

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<Widget> messages = [];
  bool isLoading = false;

  final ScrollController _scrollController = ScrollController(); // Add this line

  @override
  void initState() {
    super.initState();
    // _scrollController = ScrollController();
    _showGreetingAndMainMenu();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }
  void _handleUserMessage(String text) {
    setState(() {
      messages.add(UserMessage(
        text: text,
        time: DateFormat('hh:mm a').format(DateTime.now()),
      ));
    });
    _scrollToBottom();
  }

  void _showGreetingAndMainMenu() {
    setState(() {
      messages.add(BotMessage(
        text: "Hello! Welcome to ParkMyWheels. How can I assist you today?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const [
          "Find a Parking Spot",
          "Book a Parking Space",
          "Manage My Booking",
          "Payment & Billing",
          "Support & Assistance"
        ],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          _handleMainMenuOption(option);
        },
      ));
    });
    _scrollToBottom();
  }
  void _handleMainMenuOption(String option) {
    switch (option) {
      case "Find a Parking Spot":
        _redirectToPage("Explore Page");
        break;
      case "Book a Parking Space":
        _redirectToPage("Booking Page");
        break;
      case "Manage My Booking":
        _showManageBookingOptions();
        break;
      case "Payment & Billing":
        _showPaymentAndBillingOptions();
        break;
      case "Support & Assistance":
        _showSupportAndAssistanceOptions();
        break;
      default:
        _showThankYouMessage();
    }
  }

  void _redirectToPage(String pageName) {
    setState(() {
      messages.add(BotMessage(
        text: "Redirecting to $pageName.",
        time: DateFormat('hh:mm a').format(DateTime.now()),
      ));
    });
    // Add your navigation logic here
    if (pageName == "Explore Page") {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => SearchScreen(userid: widget.userid,title:"Explore Parking Space(s)")), // Replace with your actual ExplorePage widget
      );
    } else if (pageName == "Booking Page") {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => ChooseParkingPage(userId: widget.userid,selectedOption: 'Instant')), // Replace with your actual BookingPage widget
      );
    }
    // Add other page navigations as needed
  }

  void _showManageBookingOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "What would you like to do?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["View My Booking", "Extend Parking Time", "Cancel Booking", "Reschedule Booking"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          _handleManageBookingOption(option);
        },
      ));
    });
  }

  void _handleManageBookingOption(String option) {
    switch (option) {
      case "View My Booking":
        _redirectToPage("My Bookings Page");
        break;
      case "Extend Parking Time":
        _showExtendParkingOptions();
        break;
      case "Cancel Booking":
        _showCancelBookingOptions();
        break;
      case "Reschedule Booking":
        _showRescheduleBookingOptions();
        break;
      default:
        _showThankYouMessage();
    }
  }

  void _showExtendParkingOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "Extension allowed for 3hrs only. Do you agree?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Agree", "Disagree"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          if (option == "Agree") {
            _redirectToPage("My Bookings Page");
          } else {
            _showThankYouMessage();
          }
        },
      ));
    });
  }

  void _showCancelBookingOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "For cancellations, please note: Refunds are only available if canceled 3 hours before start time. Do you agree?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Agree", "Disagree"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          if (option == "Agree") {
            _redirectToPage("Edit Bookings Page");
          } else {
            _showThankYouMessage();
          }
        },
      ));
    });
  }

  void _showRescheduleBookingOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "Reschedule for same day or different day?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Same Day", "Different Day"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          if (option == "Same Day") {
            _showSameDayRescheduleOptions();
          } else {
            _redirectToPage("Edit Bookings Page");
          }
        },
      ));
    });
  }

  void _showSameDayRescheduleOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "Rescheduling allowed only within 3hrs window. Do you agree?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Agree", "Disagree"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          if (option == "Agree") {
            _redirectToPage("Edit Bookings Page");
          } else {
            _showThankYouMessage();
          }
        },
      ));
    });
  }

  void _showPaymentAndBillingOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "How can I assist you with payments?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["View Payment History", "Report a Payment Issue"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          _handlePaymentAndBillingOption(option);
        },
      ));
    });
  }

  void _handlePaymentAndBillingOption(String option) {
    switch (option) {
      case "View Payment History":
        _redirectToPage("Transaction Page");
        break;
      case "Report a Payment Issue":
        _showPaymentIssueOptions();
        break;
      default:
        _showThankYouMessage();
    }
  }

  void _showPaymentIssueOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "If you have a payment issue, please describe the problem:",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Incorrect charge", "Refund not received"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          _handleSpecificPaymentIssue(option);
        },
      ));
    });
  }

  void _handleSpecificPaymentIssue(String option) {
    switch (option) {
      case "Incorrect charge":
      case "Refund not received":
        _showPaymentIssueDetails(option);
        break;
      default:
        _showThankYouMessage();
    }
  }

  void _showPaymentIssueDetails(String issue) {
    setState(() {
      messages.add(BotMessage(
        text: "Payment related queries:",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const [
          "Payment made but booking not confirmed",
          "Booking is getting struck at payment page"
        ],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          _handlePaymentIssueDetail(option);
        },
      ));
    });
  }

  void _handlePaymentIssueDetail(String option) {
    switch (option) {
      case "Payment made but booking not confirmed":
        setState(() {
          messages.add(BotMessage(
            text: "Provide the payment screenshot",
            time: DateFormat('hh:mm a').format(DateTime.now()),
            options: const ["Raise a ticket for this query"],
            onOptionSelected: (option) {
              _handleUserMessage(option);
              _showThankYouMessage();
            },
          ));
        });
        break;
      case "Booking is getting struck at payment page":
        setState(() {
          messages.add(BotMessage(
            text: "Provide the screenshot of error",
            time: DateFormat('hh:mm a').format(DateTime.now()),
            options: const ["Submit a query ticket"],
            onOptionSelected: (option) {
              _handleUserMessage(option);
              _showThankYouMessage();
            },
          ));
        });
        break;
      default:
        _showThankYouMessage();
    }
  }

  void _showSupportAndAssistanceOptions() {
    setState(() {
      messages.add(BotMessage(
        text: "What do you need help with?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Report an Occupied Spot", "Parking Lot Entry Issue", "Speak to a Support Agent"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          _handleSupportAndAssistanceOption(option);
        },
      ));
    });
  }

  void _handleSupportAndAssistanceOption(String option) {
    switch (option) {
      case "Report an Occupied Spot":
      case "Parking Lot Entry Issue":
        _raiseSupportTicket(option);
        break;
      case "Speak to a Support Agent":
        _connectToSupportAgent();
        break;
      default:
        _showThankYouMessage();
    }
  }

  void _raiseSupportTicket(String issue) {
    setState(() {
      messages.add(BotMessage(
        text: "Apologies for the inconvenience caused, shall I raise a ticket for this incident?",
        time: DateFormat('hh:mm a').format(DateTime.now()),
        options: const ["Yes", "No"],
        onOptionSelected: (option) {
          _handleUserMessage(option);
          if (option == "Yes") {
            _redirectToPage("Help and Support Page");
          } else {
            _showThankYouMessage();
          }
        },
      ));
    });
  }

  void _connectToSupportAgent() {
    setState(() {
      messages.add(BotMessage(
        text: "Connecting you to a live agent...",
        time: DateFormat('hh:mm a').format(DateTime.now()),
      ));
      // Add logic to connect to a live agent
    });
  }

  void _showThankYouMessage() {
    setState(() {
      messages.add(BotMessage(
        text: "Thanks, have a nice day!",
        time: DateFormat('hh:mm a').format(DateTime.now()),
      ));
    });
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(titleSpacing: 0,
        iconTheme:  const IconThemeData(color: Colors.black),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             Text('Support Screen',    style: GoogleFonts.poppins(
              color: Colors.black,
              fontSize: 18, // Adjust size as needed
              fontWeight: FontWeight.w600, // Adjust weight if needed
            ),
        ),
            Text(
              'We typically reply in about 7 minutes',
              style: GoogleFonts.poppins(
                color: Colors.black,
                fontSize: 14, // Adjust size as needed
                fontWeight: FontWeight.w200, // Adjust weight if needed
              ),
            ),
             ],
        ),
        // backgroundColor: ColorUtils.primarycolor(),
      ),
      body: Column(
        children: [
          _buildDateHeader(),
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              children: messages, // Do not reverse the list here
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateHeader() {
    String currentDate = DateFormat('dd MMM yyyy').format(DateTime.now());

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      color: Colors.grey[200],
      child: Center(
        child: Text(
          currentDate,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ),
    );
  }
}

class UserMessage extends StatelessWidget {
  final String text;
  final String time;

  const UserMessage({
    super.key,
    required this.text,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        constraints: const BoxConstraints(maxWidth: 280),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: ColorUtils.primarycolor(),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
              child: Text(
                text,
                style: const TextStyle(color: Colors.white),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                time,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BotMessage extends StatelessWidget {
  final String text;
  final String time;
  final List<String>? options;
  final Function(String)? onOptionSelected;

  const BotMessage({
    super.key,
    required this.text,
    required this.time,
    this.options,
    this.onOptionSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        constraints: const BoxConstraints(maxWidth: 280),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Message Bubble
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Text(text),
            ),

            // Options List
            if (options != null)
              Container(
                margin: const EdgeInsets.only(top: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 3,
                    )
                  ],
                ),
                child: Column(
                  children: options!
                      .map((option) => Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => onOptionSelected?.call(option),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: option == options!.last
                                ? BorderSide.none
                                : BorderSide(
                                color: Colors.grey[200]!),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                option,
                                style: TextStyle(
                                  color: Colors.grey[800],
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Icon(Icons.arrow_forward_ios,
                                size: 14,
                                color: Colors.grey[500]),
                          ],
                        ),
                      ),
                    ),
                  ))
                      .toList(),
                ),
              ),

            // Timestamp
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                time,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ),
          ],
        ),
      ),
    );
  }
}