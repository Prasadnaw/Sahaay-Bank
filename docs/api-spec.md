# Sahaay Bank REST API Specification

Base URL: `http://localhost:5000/api`

## Endpoints

### 1. Health Check
- **GET** `/health`
- **Response** `200 OK`:
  ```json
  { "status": "UP", "timestamp": "2026-09-03T16:00:00.000Z" }
  ```

### 2. Account Information
- **GET** `/account`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "accountHolder": "Asha Patel",
      "accountNumber": "4417",
      "upiId": "asha.patel@sahaay",
      "balance": 42180.50,
      "isFrozen": false
    }
  }
  ```

### 3. Emergency Account Freeze
- **POST** `/account/freeze`
- **Body**: `{ "frozen": true }`
- **Response** `200 OK`:
  ```json
  { "success": true, "isFrozen": true }
  ```

### 4. Transactions List
- **GET** `/transactions`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "date": "2 Sep 2026",
        "description": "Salary Credit — TechCorp",
        "type": "Credit",
        "amount": 15000.00,
        "tag": "SALARY"
      }
    ]
  }
  ```

### 5. Money Transfer (UPI Protected)
- **POST** `/transfer`
- **Body**:
  ```json
  {
    "payee": "Raju Sharma",
    "amount": 500.00,
    "pin": "1234"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "newBalance": 41680.50,
      "transaction": {
        "id": 1693756800000,
        "date": "Today",
        "description": "UPI Payment to Raju Sharma",
        "type": "Debit",
        "amount": 500.00,
        "tag": "UPI"
      }
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Invalid UPI PIN
  - `403 Forbidden`: Account is currently frozen
  - `400 Bad Request`: Insufficient funds or invalid amount

### 6. Verify UPI PIN
- **POST** `/upi/verify-pin`
- **Body**: `{ "pin": "1234" }`
- **Response** `200 OK`: `{ "success": true, "error": null }`

### 7. My QR Code
- **GET** `/qr/my-qr?amount=500`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "upiId": "asha.patel@sahaay",
      "accountHolder": "Asha Patel",
      "accountNumber": "4417",
      "amount": 500,
      "payload": "upi://pay?pa=asha.patel@sahaay&pn=Asha%20Patel&am=500"
    }
  }
  ```
