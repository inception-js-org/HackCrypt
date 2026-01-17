#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// ---------------- Fingerprint Serial ----------------
SoftwareSerial FingerSerial(2, 3); // RX, TX
Adafruit_Fingerprint finger(&FingerSerial);

// -------- Match control flag --------
bool matchMode = false;

void setup() {
  Serial.begin(9600);
  delay(2000);

  Serial.println("\n=== FINGERPRINT SYSTEM ===");
  Serial.println("Commands:");
  Serial.println("FP_ENROLL <id>");
  Serial.println("FP_MATCH   (start continuous matching)");
  Serial.println("FP_STOP    (stop matching)");
  Serial.println("FP_CLEAR   (erase ALL fingerprints)");

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

  // -------- SERIAL COMMAND HANDLING --------
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.startsWith("FP_ENROLL")) {
      int id = command.substring(9).toInt();

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

    else if (command.equalsIgnoreCase("FP_MATCH")) {
      matchMode = true;
      Serial.println("🔍 CONTINUOUS MATCHING STARTED");
    }

    else if (command.equalsIgnoreCase("FP_STOP")) {
      matchMode = false;
      Serial.println("⛔ MATCHING STOPPED");
    }

    else if (command.equalsIgnoreCase("FP_CLEAR")) {
      clearFingerprintDatabase();
    }

    else {
      Serial.println("❌ Unknown command");
    }
  }

  // -------- CONTINUOUS MATCHING --------
  if (matchMode) {
    matchFingerprint();
  }
}

// ================= ENROLL FUNCTION =================
// ❗ UNCHANGED
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
// ✅ FP_STOP now works instantly
void matchFingerprint() {
  int p = -1;

  // Wait for finger
  while (p != FINGERPRINT_OK && matchMode) {
    p = finger.getImage();

    // 🔴 CHECK SERIAL WHILE BLOCKING
    if (Serial.available()) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim();
      if (cmd.equalsIgnoreCase("FP_STOP")) {
        matchMode = false;
        Serial.println("⛔ MATCHING STOPPED");
        return;
      }
    }

    if (p == FINGERPRINT_NOFINGER) delay(100);
  }

  if (!matchMode) return;

  if (finger.image2Tz() != FINGERPRINT_OK) return;

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.print("✅ MATCH FOUND → ID: ");
    Serial.print(finger.fingerID);
    Serial.print(" | Confidence: ");
    Serial.println(finger.confidence);
  } else {
    Serial.println("❌ NO MATCH FOUND");
  }

  Serial.println("✋ Remove finger");

  while (finger.getImage() != FINGERPRINT_NOFINGER && matchMode) {

    // 🔴 CHECK SERIAL AGAIN
    if (Serial.available()) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim();
      if (cmd.equalsIgnoreCase("FP_STOP")) {
        matchMode = false;
        Serial.println("⛔ MATCHING STOPPED");
        return;
      }
    }

    delay(100);
  }
}

// ================= CLEAR DATABASE =================
void clearFingerprintDatabase() {
  Serial.println("⚠️ Clearing ALL fingerprint data...");
  if (finger.emptyDatabase() == FINGERPRINT_OK) {
    Serial.println("✅ Fingerprint database cleared");
  } else {
    Serial.println("❌ Failed to clear fingerprint database");
  }
}
