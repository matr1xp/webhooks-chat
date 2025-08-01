"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.webhookSend = void 0;
const admin = __importStar(require("firebase-admin"));
const health_check_1 = require("./health-check");
Object.defineProperty(exports, "healthCheck", { enumerable: true, get: function () { return health_check_1.healthCheck; } });
const v2_1 = require("firebase-functions/v2");
const webhook_send_1 = require("./webhook-send");
Object.defineProperty(exports, "webhookSend", { enumerable: true, get: function () { return webhook_send_1.webhookSend; } });
// Configure global options for all functions
// Default to Europe North region, but allow override via environment variable
const deployRegion = process.env.FUNCTIONS_REGION || 'us-central1';
console.log(`Configuring Firebase Functions for region: ${deployRegion}`);
(0, v2_1.setGlobalOptions)({ region: deployRegion });
// Initialize Firebase Admin SDK
admin.initializeApp();
//# sourceMappingURL=index.js.map