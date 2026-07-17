import requests
import threading
import uuid
import time

# --- تنظیمات تست ---
BASE_URL = "http://localhost:8000"
CONCURRENT_USERS = 100  # تعداد کاربرانی که همزمان حمله می‌کنند
TARGET_SEAT_ID = "STRESS-TEST-SEAT-01"  # یک صندلی واحد که همه به آن حمله می‌کنند

# شمارنده‌ها برای ثبت نتایج
results = {"success": 0, "failed": 0, "errors": 0}
results_lock = threading.Lock()


def attack_seat(user_id):
    """هر کاربر مجازی این تابع را اجرا کرده و به صندلی حمله می‌کند."""
    try:
        response = requests.post(
            f"{BASE_URL}/seats/lock",
            json={"seat_ids": [TARGET_SEAT_ID], "user_id": user_id},
            timeout=10
        )
        with results_lock:
            if response.status_code == 200:
                results["success"] += 1
            elif response.status_code == 409:
                results["failed"] += 1
            else:
                results["errors"] += 1
    except Exception as e:
        with results_lock:
            results["errors"] += 1
        print(f"Request failed: {e}")


def run_load_test():
    print("=" * 50)
    print(f"🚀 Starting Load Test: {CONCURRENT_USERS} users attacking 1 seat")
    print("=" * 50)

    threads = []
    for i in range(CONCURRENT_USERS):
        user_id = f"attacker_{i}_{uuid.uuid4().hex[:6]}"
        thread = threading.Thread(target=attack_seat, args=(user_id,))
        threads.append(thread)

    start_time = time.time()

    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    duration = time.time() - start_time

    print("\n" + "=" * 50)
    print("📊 LOAD TEST RESULTS")
    print("=" * 50)
    print(f"Total Requests Sent: {CONCURRENT_USERS}")
    print(f"✅ Successful Locks:  {results['success']}")
    print(f"🔴 Rejected (409):    {results['failed']}")
    print(f"⚠️  Server Errors:     {results['errors']}")
    print(f"⏱️  Total Time:        {duration:.2f} seconds")
    print("=" * 50)

    if results["success"] == 1:
        print("🏆 TEST PASSED! Exactly ONE user got the seat. No double-booking!")
    else:
        print(f"❌ TEST FAILED! {results['success']} users got the seat (Double-Booking Bug!)")
    print("=" * 50)


if __name__ == "__main__":
    run_load_test()