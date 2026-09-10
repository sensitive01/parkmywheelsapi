const Booking = require("../../../models/bookingSchema");
const BookingTransaction = require("../../../models/bookingtransactionSechma");
const { logActivity } = require("../../../utils/activityLogger");

/**
 * Separate controller for bulk exiting selected parked bookings:
 * - Does NOT modify existing exitvehicle controller logic.
 * - Targets ONLY the selected bookings that are currently in "PARKED" status.
 * - Sets amount = "0.00" for the selected bookings as requested.
 * - Sets status = "COMPLETED".
 * - Records exit date & exit time in Indian Standard Time (IST).
 * - Leaves all other bookings in the system completely untouched.
 */
exports.bulkExitBookings = async (req, res) => {
  try {
    const { bookingIds, selectAllFiltered, filters } = req.body;

    let targetQuery = null;

    if (Array.isArray(bookingIds) && bookingIds.length > 0) {
      // Target only the selected IDs that are currently in parked status
      targetQuery = {
        _id: { $in: bookingIds },
        status: { $regex: /^parked$/i }
      };
    } else if (selectAllFiltered && filters) {
      // Target all bookings matching active filters that are currently in parked status
      const andConditions = [{ status: { $regex: /^parked$/i } }];

      if (filters.vendorId) andConditions.push({ vendorId: filters.vendorId });
      if (filters.vehicleType) andConditions.push({ vehicleType: filters.vehicleType });
      if (filters.sts) andConditions.push({ sts: filters.sts });

      const parseTimeToMinutes = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const trimmed = timeStr.trim();
        const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (!match) return null;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3]?.toUpperCase();
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const getDateFormats = (dateObj) => {
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return [`${d}-${m}-${y}`, `${d}/${m}/${y}`, `${y}-${m}-${d}`];
      };

      const buildBookingTimeExpr = () => ({
        $let: {
          vars: {
            cleanTime: { $trim: { input: { $ifNull: ['$bookingTime', { $ifNull: ['$parkingTime', ''] }] } } }
          },
          in: {
            $let: {
              vars: {
                parts: { $split: ['$$cleanTime', ' '] }
              },
              in: {
                $let: {
                  vars: {
                    timeParts: { $split: [{ $arrayElemAt: ['$$parts', 0] }, ':'] },
                    ampm: { $toUpper: { $ifNull: [{ $arrayElemAt: ['$$parts', 1] }, ''] } }
                  },
                  in: {
                    $let: {
                      vars: {
                        rawHour: { $convert: { input: { $arrayElemAt: ['$$timeParts', 0] }, to: 'int', onError: 0, onNull: 0 } },
                        rawMin: { $convert: { input: { $arrayElemAt: ['$$timeParts', 1] }, to: 'int', onError: 0, onNull: 0 } }
                      },
                      in: {
                        $add: [
                          {
                            $multiply: [
                              {
                                $switch: {
                                  branches: [
                                    {
                                      case: { $and: [{ $eq: ['$$ampm', 'PM'] }, { $ne: ['$$rawHour', 12] }] },
                                      then: { $add: ['$$rawHour', 12] }
                                    },
                                    {
                                      case: { $and: [{ $eq: ['$$ampm', 'AM'] }, { $eq: ['$$rawHour', 12] }] },
                                      then: 0
                                    }
                                  ],
                                  default: '$$rawHour'
                                }
                              },
                              60
                            ]
                          },
                          '$$rawMin'
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const startStr = filters.bookingFromDate || filters.fromDate;
      const endStr = filters.bookingToDate || filters.toDate;
      const startTime = filters.bookingFromTime || filters.fromTime;
      const endTime = filters.bookingToTime || filters.toTime;

      const parseDateInput = (str) => {
        if (!str || typeof str !== 'string') return null;
        if (str.includes('-')) {
          const parts = str.split('-');
          if (parts[0].length === 4) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          } else if (parts[2].length === 4) {
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
        } else if (str.includes('/')) {
          const parts = str.split('/');
          if (parts[2]?.length === 4) {
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
        }
        const parsed = new Date(str);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const fromD = parseDateInput(startStr || filters.bookingDate);
      const toD = parseDateInput(endStr || filters.bookingDate);
      const fromMin = parseTimeToMinutes(startTime);
      const toMin = parseTimeToMinutes(endTime);
      const timeExpr = buildBookingTimeExpr();

      if (fromD && toD) {
        const isSameDay = (
          fromD.getFullYear() === toD.getFullYear() &&
          fromD.getMonth() === toD.getMonth() &&
          fromD.getDate() === toD.getDate()
        );

        if (isSameDay) {
          const dayFormats = getDateFormats(fromD);
          andConditions.push({
            $or: [
              { bookingDate: { $in: dayFormats } },
              { parkingDate: { $in: dayFormats } }
            ]
          });
          if (fromMin !== null) {
            andConditions.push({ $expr: { $gte: [timeExpr, fromMin] } });
          }
          if (toMin !== null) {
            andConditions.push({ $expr: { $lte: [timeExpr, toMin] } });
          }
        } else {
          const startFormats = getDateFormats(fromD);
          const endFormats = getDateFormats(toD);

          const middleFormats = [];
          const curr = new Date(fromD);
          curr.setDate(curr.getDate() + 1);
          while (curr < toD && middleFormats.length < 1000) {
            middleFormats.push(...getDateFormats(curr));
            curr.setDate(curr.getDate() + 1);
          }

          if (fromMin !== null || toMin !== null) {
            const multiDayOr = [];

            const startDayConds = [
              { $or: [{ bookingDate: { $in: startFormats } }, { parkingDate: { $in: startFormats } }] }
            ];
            if (fromMin !== null) {
              startDayConds.push({ $expr: { $gte: [timeExpr, fromMin] } });
            }
            multiDayOr.push({ $and: startDayConds });

            if (middleFormats.length > 0) {
              multiDayOr.push({
                $or: [{ bookingDate: { $in: middleFormats } }, { parkingDate: { $in: middleFormats } }]
              });
            }

            const endDayConds = [
              { $or: [{ bookingDate: { $in: endFormats } }, { parkingDate: { $in: endFormats } }] }
            ];
            if (toMin !== null) {
              endDayConds.push({ $expr: { $lte: [timeExpr, toMin] } });
            }
            multiDayOr.push({ $and: endDayConds });

            andConditions.push({ $or: multiDayOr });
          } else {
            const allDates = [...startFormats, ...middleFormats, ...endFormats];
            andConditions.push({
              $or: [
                { bookingDate: { $in: allDates } },
                { parkingDate: { $in: allDates } },
                { createdAt: { $gte: new Date(new Date(fromD).setHours(0, 0, 0, 0)), $lte: new Date(new Date(toD).setHours(23, 59, 59, 999)) } }
              ]
            });
          }
        }
      } else if (fromD) {
        const startFormats = getDateFormats(fromD);
        const curr = new Date(fromD);
        curr.setDate(curr.getDate() + 1);
        const maxDate = new Date(fromD);
        maxDate.setMonth(maxDate.getMonth() + 3);
        const futureFormats = [];
        while (curr <= maxDate && futureFormats.length < 1000) {
          futureFormats.push(...getDateFormats(curr));
          curr.setDate(curr.getDate() + 1);
        }

        if (fromMin !== null) {
          andConditions.push({
            $or: [
              {
                $and: [
                  { $or: [{ bookingDate: { $in: startFormats } }, { parkingDate: { $in: startFormats } }] },
                  { $expr: { $gte: [timeExpr, fromMin] } }
                ]
              },
              { $or: [{ bookingDate: { $in: futureFormats } }, { parkingDate: { $in: futureFormats } }] }
            ]
          });
        } else {
          const allDates = [...startFormats, ...futureFormats];
          andConditions.push({
            $or: [
              { bookingDate: { $in: allDates } },
              { parkingDate: { $in: allDates } },
              { createdAt: { $gte: new Date(new Date(fromD).setHours(0, 0, 0, 0)) } }
            ]
          });
        }
      } else if (toD) {
        const endFormats = getDateFormats(toD);
        const curr = new Date(toD);
        curr.setDate(curr.getDate() - 1);
        const minDate = new Date(toD);
        minDate.setMonth(minDate.getMonth() - 3);
        const pastFormats = [];
        while (curr >= minDate && pastFormats.length < 1000) {
          pastFormats.push(...getDateFormats(curr));
          curr.setDate(curr.getDate() - 1);
        }

        if (toMin !== null) {
          andConditions.push({
            $or: [
              {
                $and: [
                  { $or: [{ bookingDate: { $in: endFormats } }, { parkingDate: { $in: endFormats } }] },
                  { $expr: { $lte: [timeExpr, toMin] } }
                ]
              },
              { $or: [{ bookingDate: { $in: pastFormats } }, { parkingDate: { $in: pastFormats } }] }
            ]
          });
        } else {
          const allDates = [...endFormats, ...pastFormats];
          andConditions.push({
            $or: [
              { bookingDate: { $in: allDates } },
              { parkingDate: { $in: allDates } },
              { createdAt: { $lte: new Date(new Date(toD).setHours(23, 59, 59, 999)) } }
            ]
          });
        }
      } else if (fromMin !== null || toMin !== null) {
        if (fromMin !== null) {
          andConditions.push({ $expr: { $gte: [timeExpr, fromMin] } });
        }
        if (toMin !== null) {
          andConditions.push({ $expr: { $lte: [timeExpr, toMin] } });
        }
      }

      if (filters.bookingSource === 'user') {
        andConditions.push({ userId: { $exists: true, $ne: null, $ne: "" } });
      } else if (filters.bookingSource === 'vendor') {
        andConditions.push({ $or: [{ userId: { $exists: false } }, { userId: null }, { userId: "" }] });
      }

      if (filters.search) {
        andConditions.push({
          $or: [
            { personName: { $regex: filters.search, $options: 'i' } },
            { vehicleNumber: { $regex: filters.search, $options: 'i' } },
            { vendorName: { $regex: filters.search, $options: 'i' } }
          ]
        });
      }

      targetQuery = { $and: andConditions };
    } else {
      return res.status(400).json({ success: false, message: "No booking IDs or filter criteria provided." });
    }

    const bookingsToExit = await Booking.find(targetQuery);

    if (!bookingsToExit || bookingsToExit.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No parked bookings found matching the selection."
      });
    }

    // Current India Date & Time
    const nowInIndia = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = nowInIndia.split(", ");
    const [d, m, y] = datePart.split("/");
    const exitvehicledate = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;

    const timeParts = timePart.split(" ");
    const ampm = timeParts[timeParts.length - 1];
    const timeOnly = timeParts.slice(0, -1).join(" ");
    const [h, min] = timeOnly.split(":");
    const exitvehicletime = `${h.padStart(2, '0')}:${min.padStart(2, '0')} ${ampm}`.toUpperCase();

    let exitCount = 0;

    const CHUNK_SIZE = 25;
    for (let i = 0; i < bookingsToExit.length; i += CHUNK_SIZE) {
      const chunk = bookingsToExit.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (booking) => {
          // Calculate duration in hours
          let parkedDurationHours = "1";
          try {
            if (booking.parkedDate && booking.parkedTime) {
              const [pDay, pMonth, pYear] = booking.parkedDate.split('-');
              const [pTimePart, pAmpm] = booking.parkedTime.split(' ');
              let [pHours, pMinutes] = pTimePart.split(':').map(Number);
              if (pAmpm && pAmpm.toUpperCase() === 'PM' && pHours !== 12) pHours += 12;
              if (pAmpm && pAmpm.toUpperCase() === 'AM' && pHours === 12) pHours = 0;

              const startTime = new Date(parseInt(pYear), parseInt(pMonth) - 1, parseInt(pDay), pHours, pMinutes);
              const nowTime = new Date();
              const diffMs = nowTime - startTime;
              if (diffMs > 0) {
                const calculated = Math.ceil(diffMs / (1000 * 60 * 60));
                parkedDurationHours = String(Math.max(1, calculated));
              }
            }
          } catch (err) {
            console.error("Error calculating duration for bulk exit:", err.message);
          }

          // Update booking with amount = 0 as requested
          booking.amount = "0.00";
          booking.hour = parkedDurationHours;
          booking.totalamout = "0.00";
          booking.gstamout = "0.00";
          booking.handlingfee = "0.00";
          booking.releasefee = "0.00";
          booking.recievableamount = "0.00";
          booking.payableamout = "0.00";
          booking.exitvehicledate = exitvehicledate;
          booking.exitvehicletime = exitvehicletime;
          booking.status = "COMPLETED";

          await booking.save();
          exitCount++;

          // Create BookingTransaction record
          try {
            const transaction = new BookingTransaction({
              bookingId: booking._id,
              vendorId: booking.vendorId,
              vendorName: booking.vendorName,
              userId: booking.userid,
              vehicleNumber: booking.vehicleNumber,
              vehicleType: booking.vehicleType,
              personName: booking.personName,
              mobileNumber: booking.mobileNumber,
              bookingAmount: "0.00",
              gstAmount: "0.00",
              handlingFee: "0.00",
              totalAmount: "0.00",
              platformFee: "0.00",
              receivableAmount: "0.00",
              payableAmount: "0.00",
              bookingDate: booking.bookingDate,
              parkingDate: booking.parkingDate,
              exitDate: exitvehicledate,
              bookingTime: booking.bookingTime,
              parkingTime: booking.parkingTime,
              exitTime: exitvehicletime,
              bookingType: booking.bookType,
              subscriptionType: booking.subsctiptiontype,
              subscriptionEndDate: booking.subsctiptionenddate,
              sts: booking.sts || null,
              paymentMode: booking.paymentMode || "Cash"
            });
            await transaction.save();
          } catch (txErr) {
            console.error(`Error creating transaction for booking ${booking._id}:`, txErr.message);
          }

          // Log activity
          try {
            await logActivity({
              req,
              actor: { vendorId: booking.vendorId },
              actorType: "ADMIN",
              action: "BULK_EXIT",
              resourceType: "BOOKING",
              resourceId: booking._id,
              details: {
                vehicleNumber: booking.vehicleNumber,
                amount: "0.00",
                exitDate: exitvehicledate,
                exitTime: exitvehicletime
              }
            });
          } catch (logErr) {
            // Continue even if logging fails
          }
        })
      );
    }

    return res.status(200).json({
      success: true,
      count: exitCount,
      message: `Successfully exited ${exitCount} vehicles with amount set to ₹0.00.`
    });
  } catch (error) {
    console.error("Bulk exit error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
