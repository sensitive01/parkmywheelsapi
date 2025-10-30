import 'dart:async'; // Import this for Completer
import 'package:audioplayers/audioplayers.dart' show AssetSource, AudioPlayer;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth/customer/customerdash.dart';
import 'auth/customer/splashregister/register.dart';
import 'auth/vendor/vendordash.dart';
final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
FlutterLocalNotificationsPlugin();

// 🔔 Background message handler
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling a background message: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  // Timer(Duration(seconds: 2), () {
  //   SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
  // });
  // await SystemChrome.setPreferredOrientations([
  //   DeviceOrientation.portraitUp,
  //   DeviceOrientation.portraitDown
  // ]);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent, // Transparent status bar
    statusBarIconBrightness: Brightness.dark, // Dark icons for light backgrounds
    systemNavigationBarColor: Colors.transparent, // Transparent navigation bar
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    RemoteNotification? notification = message.notification;
    AndroidNotification? android = message.notification?.android;

    if (notification != null && android != null) {
      flutterLocalNotificationsPlugin.show(
        notification.hashCode,
        notification.title,
        notification.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel',
            'High Importance Notifications',
            channelDescription: 'This channel is used for important notifications.',
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
            sound: RawResourceAndroidNotificationSound('bell'), // no file extension
          ),
        ),

      );
    }
  });

  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'high_importance_channel',
    'High Importance Notifications',
    description: 'This channel is used for important notifications.',
    importance: Importance.high,
    sound: RawResourceAndroidNotificationSound('bell'), // add this
  );


  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
    alert: true,
    // badge: true,
    sound: true,
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {

    return  const GetMaterialApp(
      debugShowCheckedModeBanner: false,
      home: SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  final Completer<void> _audioCompleter = Completer<void>();
  late AnimationController _animationController;
  late List<Animation<double>> _letterAnimations;

  final String _text = "Smart Parking Made Easy";

  @override
  void initState() {
    super.initState();
    _playLogoSound();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    _letterAnimations = List.generate(
      _text.length,
          (index) => Tween<double>(begin: 1.0, end: 0.0).animate(
        CurvedAnimation(
          parent: _animationController,
          curve: Interval(
            index / _text.length, // Staggered effect
            1.0,
            curve: Curves.easeInOut,
          ),
        ),
      ),
    );

    _animationController.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _navigateToNextScreen();
    });
  }

  Future<void> _playLogoSound() async {
    try {
      await AudioManager().playAudio('logo.mp3');
      Future.delayed(const Duration(seconds: 3), () {
        if (!_audioCompleter.isCompleted) {
          _audioCompleter.complete();
        }
      });
    } catch (e) {
      debugPrint("Error playing sound: $e");
    }
  }

  Future<void> _navigateToNextScreen() async {
    try {
      await _audioCompleter.future;
      SharedPreferences prefs = await SharedPreferences.getInstance();
      Widget initialScreen = await getInitialScreen(prefs);

      if (mounted) {
        Get.off(() => FadeInScreen(initialScreen: initialScreen));
      }
    } catch (e) {
      debugPrint("Error navigating to next screen: $e");
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 90.0,right: 90),
              child: Image.asset('assets/gifload.gif'),
            ),
            const SizedBox(height: 5),
            AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                return RichText(
                  text: TextSpan(
                    children: List.generate(
                      _text.length,
                          (index) => WidgetSpan(
                        child: Transform.translate(
                          offset: Offset(_letterAnimations[index].value * 50, 0), // Moves from right
                          child: Opacity(
                            opacity: 1.0 - _letterAnimations[index].value, // Fades in
                            child: Text(
                              _text[index],
                              style: GoogleFonts.poppins(
                                fontSize: 14.0,
                                fontWeight: FontWeight.bold,
                                color: Colors.black,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class AudioManager {
  static final AudioManager _instance = AudioManager._internal();
  final AudioPlayer _audioPlayer = AudioPlayer();

  factory AudioManager() => _instance;

  AudioManager._internal();

  Future<void> playAudio(String assetPath) async {
    try {
      await _audioPlayer.play(AssetSource(assetPath));
    } catch (e) {
      print("Error playing audio: $e");
    }
  }

  void stopAudio() {
    _audioPlayer.stop();
  }
}

class FadeInScreen extends StatefulWidget {
  final Widget initialScreen;

  const FadeInScreen({super.key, required this.initialScreen});

  @override
  _FadeInScreenState createState() => _FadeInScreenState();
}

class _FadeInScreenState extends State<FadeInScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeIn,
      ),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacityAnimation,
      child: widget.initialScreen,
    );
  }
}

Future<Widget> getInitialScreen(SharedPreferences prefs) async {
  int? loginStatus = prefs.getInt('login_status');
  if (loginStatus == 1) {
    String? userId = prefs.getString('id');
    String? vendorId = prefs.getString('vendorId');

    if (userId != null && userId.isNotEmpty) {
      return customdashScreen(userId: userId);
    } else if (vendorId != null && vendorId.isNotEmpty) {
      return vendordashScreen(vendorid: vendorId);
    }
  }
  return const splashlogin();
}