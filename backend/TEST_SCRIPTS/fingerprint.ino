#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// ---------------- Fingerprint Serial ----------------
// Arduino UNO / Nano
// R307 TX -> D2
// R307 RX -> D3
SoftwareSerial FingerSerial(2, 3);
Adafruit_Fingerprint finger(&FingerSerial);

void setup() {
  Serial.begin(9600);
  delay(2000);

  Serial.println("\n=== FINGERPRINT SYSTEM ===");
  Serial.println("Commands:");
  Serial.println("FP_ENROLL <id>");
  Serial.println("FP_MATCH");

  FingerSerial.begin(57600);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("✅ Fingerprint sensor detected");
  } else {
    Serial.println("❌ Fingerprint sensor NOT detected");
    while (1);
  }
}

void loop() {
  if (!Serial.available()) return;

  String command = Serial.readStringUntil('\n');
  command.trim();

  // ---------- ENROLL ----------
  if (command.startsWith("FP_ENROLL")) {

    int id = command.substring(9).toInt(); // after "FP_ENROLL"

    if (id < 1 || id > 127) {
      Serial.println("❌ Invalid Fingerprint ID (1–127)");
      return;
    }

    Serial.print("📝 Enrolling Fingerprint ID: ");
    Serial.println(id);

    if (enrollFingerprint(id)) {
      Serial.println("🎉 Fingerprint Enrollment SUCCESS");
    } else {
      Serial.println("❌ Fingerprint Enrollment FAILED");
    }
  }

  // ---------- MATCH ----------
  else if (command.equalsIgnoreCase("FP_MATCH")) {
    Serial.println("🔍 Place finger on sensor...");
    matchFingerprint();
  }

  else {
    Serial.println("❌ Unknown command");
  }
}

// ================= ENROLL FUNCTION =================
bool enrollFingerprint(uint8_t id) {
  int p = -1;

  Serial.println("👉 Place finger");
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  if (finger.image2Tz(1) != FINGERPRINT_OK) return false;

  Serial.println("✋ Remove finger");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER);

  Serial.println("👉 Place SAME finger again");
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  if (finger.image2Tz(2) != FINGERPRINT_OK) return false;

  if (finger.createModel() != FINGERPRINT_OK) {
    Serial.println("❌ Fingerprints did NOT match");
    return false;
  }

  if (finger.storeModel(id) != FINGERPRINT_OK) {
    Serial.println("❌ Failed to store fingerprint");
    return false;
  }

  return true;
}

// ================= MATCH FUNCTION =================
void matchFingerprint() {
  int p = finger.getImage();
  if (p != FINGERPRINT_OK) {
    Serial.println("❌ No finger detected");
    return;
  }

  if (finger.image2Tz() != FINGERPRINT_OK) {
    Serial.println("❌ Image conversion failed");
    return;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.print("✅ MATCH → ID: ");
    Serial.print(finger.fingerID);
    Serial.print(" | Confidence: ");
    Serial.println(finger.confidence);
  } else {
    Serial.println("❌ NO MATCH FOUND");
  }
}
