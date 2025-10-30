import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationServices {
  /// Creating a Private constructor to prevent instantiating this class
  NotificationServices._();

  /// Create a [AndroidNotificationChannel] for heads up notifications
  static AndroidNotificationChannel? _channel;

  /// Initialize the [FlutterLocalNotificationsPlugin] package
  static FlutterLocalNotificationsPlugin? _flutterLocalNotificationsPlugin;

  /// Initialize the [_firebaseMessaging] instance
  static FirebaseMessaging? _firebaseMessaging;





  /*static void updateNotification(NotificationModel notification) async {
    final list = _getNotifications()
      ..removeWhere((element) {
        return element.body == notification.body &&
            element.title == notification.title &&
            element.dateTime == notification.dateTime;
      });

    await kAppStorage.setStringList(PrefConst.notifications,
        [jsonEncode(notification.toJson()), for (var j in list) jsonEncode(j)]);
  }*/

  /// Clear all notifications
/*  static void clear() async {
    await kAppStorage.remove(PrefConst.notifications);
    _notificationController.sink.add([]);
  }*/

  /// the [init] method initializes the Firebase and Firebase messaging services
  static Future<FirebaseApp> init() async {
    // initialize firebase
    var firebase = await Firebase.initializeApp();

    // on background message
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

    /// init [_firebaseMessaging]
    _firebaseMessaging = FirebaseMessaging.instance;

    /// init [_channel]
    _channel = const AndroidNotificationChannel(
        'high_importance_channel', // id
        'High Importance Notifications', // title
        description: 'This channel is used for important notifications.',
        // description
        importance: Importance.high);

    // init local notification plugin
    _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

    await _flutterLocalNotificationsPlugin!
        .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel!);

    // set messaging options
    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
        alert: true,
        // badge: true,
        sound: true);

    return firebase;
  }

  /// method [_handleBackgroundMessage] handles messages received in background
  static Future<void> _handleBackgroundMessage(RemoteMessage message) async {
    await Firebase.initializeApp();
    if (handleFCMData != null) {
      handleFCMData!(message);
    }
  }

  static void showMessage() {
    // assert initialization of this class
    assert(
    _flutterLocalNotificationsPlugin != null &&
        _channel != null &&
        _firebaseMessaging != null,
    'Make sure you have called init() method');
  }

  /// [initOnMessage] method handles foreground message
  static void onMessage() {
    // assert initialization of this class
    assert(
    _flutterLocalNotificationsPlugin != null &&
        _channel != null &&
        _firebaseMessaging != null,
    'Make sure you have called init() method');

    // listen to foreground messages

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      /// if [showNotification] is true then the notification will be shown
      ///
      // print("Notification Message : $message");
      var showNotification = 'true';
      if (message.data['showNotification'] != null) {
        showNotification = '${message.data['showNotification']}';
      }
      RemoteNotification notification = message.notification!;
      AndroidNotification? android = message.notification?.android;
      if (android != null &&
          showNotification == 'true') {
        //   kNotificationCountProvider.getCount();
        // show notification
        _flutterLocalNotificationsPlugin!.show(
            notification.hashCode,
            notification.title,
            notification.body,
            NotificationDetails(
              android: AndroidNotificationDetails(_channel!.id, _channel!.name,
                  channelDescription: _channel!.description,
                  icon: 'mipmap/ic_launcher',
                  styleInformation:
                  BigTextStyleInformation(notification.body!)),
            ));
      }
      if (handleFCMData != null) {
        handleFCMData!(message);
      }
    });
  }

  /// Method to show notification
  static void showNotification(RemoteNotification notification) async {
    return await _flutterLocalNotificationsPlugin!.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel!.id,
          _channel!.name,
          channelDescription: _channel!.description,
          icon: 'mipmap/ic_launcher',
          styleInformation: BigTextStyleInformation(notification.body!),
        ),
      ),
    );
  }

  // method to get fcm token
  static Future<String?> getFcmToken() async {
    // assert initialization of this class
    assert(
    _flutterLocalNotificationsPlugin != null &&
        _channel != null &&
        _firebaseMessaging != null,
    'Make sure you have called init() method');

    // subscribe to all topics
    await _firebaseMessaging!.subscribeToTopic('all');
    return await _firebaseMessaging!.getToken();
  }

  /// [handleFCMData] method what action will be taken while user gets notification
  static void Function(RemoteMessage)? handleFCMData;
}
