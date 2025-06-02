"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var admin = require("firebase-admin");
var path = require("path");
var fs = require("fs");
var { v4: uuidv4 } = require('uuid');
// Initialize Firebase Admin SDK with explicit credentials
var serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
var serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
var db = admin.firestore();
async function addTestAvailability(stylistId) {
    var defaultSchedule = {
        exceptions: [],
        lastUpdated: new Date().toISOString(),
        weeklySchedule: {
            monday: {
                enabled: true,
                slots: [
                    { start: '09:00', startPeriod: 'AM', end: '12:00', endPeriod: 'PM', id: '1' },
                    { start: '01:00', startPeriod: 'PM', end: '05:00', endPeriod: 'PM', id: '2' }
                ]
            },
            tuesday: {
                enabled: true,
                slots: [
                    { start: '09:00', startPeriod: 'AM', end: '12:00', endPeriod: 'PM', id: '3' },
                    { start: '01:00', startPeriod: 'PM', end: '05:00', endPeriod: 'PM', id: '4' }
                ]
            },
            wednesday: {
                enabled: true,
                slots: [
                    { start: '09:00', startPeriod: 'AM', end: '12:00', endPeriod: 'PM', id: '5' },
                    { start: '01:00', startPeriod: 'PM', end: '05:00', endPeriod: 'PM', id: '6' }
                ]
            },
            thursday: {
                enabled: true,
                slots: [
                    { start: '09:00', startPeriod: 'AM', end: '12:00', endPeriod: 'PM', id: '7' },
                    { start: '01:00', startPeriod: 'PM', end: '05:00', endPeriod: 'PM', id: '8' }
                ]
            },
            friday: {
                enabled: true,
                slots: [
                    { start: '09:00', startPeriod: 'AM', end: '12:00', endPeriod: 'PM', id: '9' },
                    { start: '01:00', startPeriod: 'PM', end: '05:00', endPeriod: 'PM', id: '10' }
                ]
            },
            saturday: {
                enabled: true,
                slots: [
                    { start: '10:00', startPeriod: 'AM', end: '03:00', endPeriod: 'PM', id: '11' }
                ]
            },
            sunday: {
                enabled: true,
                slots: [
                    { start: '10:00', startPeriod: 'AM', end: '03:00', endPeriod: 'PM', id: '12' }
                ]
            }
        }
    };
    try {
        await db.collection('stylists').doc(stylistId)
            .collection('settings').doc('availability')
            .set(defaultSchedule);
        console.log("Added availability settings for stylist: ".concat(stylistId));
    }
    catch (error) {
        console.error('Error adding availability:', error);
    }
}
// Get stylistId from command line argument
var stylistId = process.argv[2];
if (!stylistId) {
    console.error('Please provide a stylist ID as an argument');
    process.exit(1);
}
addTestAvailability(stylistId)
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
