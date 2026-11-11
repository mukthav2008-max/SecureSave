"""
SecureSave - Standalone WebAssembly Binary Generator
Generates wasm/securesave.wasm conforming strictly to the WebAssembly 1.0 binary specification.
Contains all exported C mathematical functions for SecureSave.
"""

import struct
import os

# WASM Type Constants
TYPE_I32 = 0x7F
TYPE_I64 = 0x7E
TYPE_F32 = 0x7D
TYPE_F64 = 0x7C
TYPE_FUNC = 0x60
TYPE_EMPTY = 0x40

# Section IDs
SEC_TYPE = 1
SEC_IMPORT = 2
SEC_FUNCTION = 3
SEC_TABLE = 4
SEC_MEMORY = 5
SEC_GLOBAL = 6
SEC_EXPORT = 7
SEC_START = 8
SEC_ELEMENT = 9
SEC_CODE = 10
SEC_DATA = 11

def encode_u32(val):
    """Encode unsigned 32-bit LEB128."""
    res = bytearray()
    while True:
        b = val & 0x7F
        val >>= 7
        if val != 0:
            res.append(b | 0x80)
        else:
            res.append(b)
            break
    return bytes(res)

def encode_s32(val):
    """Encode signed 32-bit LEB128."""
    res = bytearray()
    more = True
    while more:
        b = val & 0x7F
        val >>= 7
        sign_bit = (b & 0x40) != 0
        if (val == 0 and not sign_bit) or (val == -1 and sign_bit):
            more = False
        else:
            b |= 0x80
        res.append(b)
    return bytes(res)

def encode_s64(val):
    """Encode signed 64-bit LEB128."""
    res = bytearray()
    more = True
    while more:
        b = val & 0x7F
        val >>= 7
        sign_bit = (b & 0x40) != 0
        if (val == 0 and not sign_bit) or (val == -1 and sign_bit):
            more = False
        else:
            b |= 0x80
        res.append(b)
    return bytes(res)

def encode_f64(val):
    return struct.pack('<d', float(val))

def encode_vector(items):
    return encode_u32(len(items)) + b"".join(items)

def encode_string(s):
    encoded = s.encode('utf-8')
    return encode_u32(len(encoded)) + encoded

def encode_section(sec_id, payload):
    return bytes([sec_id]) + encode_u32(len(payload)) + payload

class WasmBuilder:
    def __init__(self):
        self.types = []
        self.func_type_indices = []
        self.exports = []
        self.codes = []

    def get_or_add_type(self, params, results):
        sig = (tuple(params), tuple(results))
        for idx, s in enumerate(self.types):
            if s == sig:
                return idx
        self.types.append(sig)
        return len(self.types) - 1

    def add_function(self, name, params, results, locals_list, bytecode):
        type_idx = self.get_or_add_type(params, results)
        func_idx = len(self.func_type_indices)
        self.func_type_indices.append(type_idx)
        self.exports.append((name, func_idx))

        # Encode locals: count, type
        # locals_list is list of (count, type)
        loc_bytes = encode_vector([encode_u32(cnt) + bytes([t]) for cnt, t in locals_list])
        func_body = loc_bytes + bytecode + bytes([0x0B]) # 0x0B = end
        self.codes.append(encode_u32(len(func_body)) + func_body)
        return func_idx

    def build(self):
        # Header
        wasm = bytearray(b"\x00asm\x01\x00\x00\x00")

        # 1. Type Section
        type_entries = []
        for params, results in self.types:
            entry = bytes([TYPE_FUNC])
            entry += encode_vector([bytes([p]) for p in params])
            entry += encode_vector([bytes([r]) for r in results])
            type_entries.append(entry)
        wasm += encode_section(SEC_TYPE, encode_vector(type_entries))

        # 3. Function Section
        wasm += encode_section(SEC_FUNCTION, encode_vector([encode_u32(ti) for ti in self.func_type_indices]))

        # 7. Export Section
        export_entries = []
        for name, func_idx in self.exports:
            entry = encode_string(name) + bytes([0x00]) + encode_u32(func_idx)
            export_entries.append(entry)
        wasm += encode_section(SEC_EXPORT, encode_vector(export_entries))

        # 10. Code Section
        wasm += encode_section(SEC_CODE, encode_vector(self.codes))

        return bytes(wasm)

# Opcode constants
LOCAL_GET = 0x20
LOCAL_SET = 0x21
LOCAL_TEE = 0x22
I32_CONST = 0x41
I64_CONST = 0x42
F64_CONST = 0x44
BLOCK = 0x02
LOOP = 0x03
IF = 0x04
ELSE = 0x05
END = 0x0B
BR = 0x0C
BR_IF = 0x0D
RETURN = 0x0F
CALL = 0x10

I32_EQZ = 0x45
I32_EQ = 0x46
I32_NE = 0x47
I32_LT_S = 0x48
I32_GT_S = 0x4A
I32_LE_S = 0x4C
I32_GE_S = 0x4E
I32_ADD = 0x6A
I32_SUB = 0x6B
I32_MUL = 0x6C
I32_DIV_S = 0x6D
I32_REM_S = 0x6F
I32_AND = 0x71
I32_OR = 0x72

I64_EQZ = 0x50
I64_EQ = 0x51
I64_NE = 0x52
I64_LT_S = 0x53
I64_GT_S = 0x55
I64_LE_S = 0x57
I64_GE_S = 0x59
I64_ADD = 0x7C
I64_SUB = 0x7D
I64_MUL = 0x7E
I64_DIV_S = 0x7F
I64_REM_S = 0x81
I64_AND = 0x83
I64_SHR_U = 0x88

F64_EQ = 0x61
F64_LT = 0x63
F64_GT = 0x64
F64_LE = 0x65
F64_GE = 0x66
F64_ABS = 0x99
F64_ADD = 0xA0
F64_SUB = 0xA1
F64_MUL = 0xA2
F64_DIV = 0xA3
F64_CONVERT_I32_S = 0xB7
F64_CONVERT_I64_S = 0xB9
I32_TRUNC_F64_S = 0xB0

def build_securesave_wasm():
    wb = WasmBuilder()

    # -------------------------------------------------------------
    # 1. c_budget_total_expenses(food: f64, trans: f64, edu: f64, shop: f64, oth: f64) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_ADD])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_ADD])
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([F64_ADD])
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([F64_ADD])
    wb.add_function("c_budget_total_expenses", [TYPE_F64]*5, [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 2. c_budget_savings(income: f64, expenses: f64) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_SUB])
    wb.add_function("c_budget_savings", [TYPE_F64, TYPE_F64], [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 3. c_budget_savings_percentage(income: f64, savings: f64) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LE])
    b += bytes([IF, TYPE_F64])
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([ELSE])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_DIV])
    b += bytes([F64_CONST]) + encode_f64(100.0)
    b += bytes([F64_MUL])
    b += bytes([END])
    wb.add_function("c_budget_savings_percentage", [TYPE_F64, TYPE_F64], [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 4. c_budget_validate(income, food, trans, edu, shop, oth) -> i32
    # 0 = ok, 1 = inc < 0, 2 = inc == 0, 3 = expense < 0
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([BLOCK, TYPE_EMPTY])
    # check income < 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([RETURN])
    b += bytes([END])
    # check income == 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_EQ])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(2)
    b += bytes([RETURN])
    b += bytes([END])
    # check expenses
    for i in range(1, 6):
        b += bytes([LOCAL_GET]) + encode_u32(i)
        b += bytes([F64_CONST]) + encode_f64(0.0)
        b += bytes([F64_LT])
        b += bytes([IF, TYPE_EMPTY])
        b += bytes([I32_CONST]) + encode_s32(3)
        b += bytes([RETURN])
        b += bytes([END])
    b += bytes([END])
    b += bytes([I32_CONST]) + encode_s32(0)
    wb.add_function("c_budget_validate", [TYPE_F64]*6, [TYPE_I32], [], bytes(b))

    # -------------------------------------------------------------
    # 5. c_budget_status_code(savings_percentage: f64, savings: f64) -> i32
    # -1: deficit, 0: break-even, 1: low (<10), 2: moderate (10-20), 3: healthy (20-50), 4: exceptional (>50)
    # -------------------------------------------------------------
    b = bytearray()
    # if savings < 0 -> -1
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(-1)
    b += bytes([RETURN])
    b += bytes([END])
    # if savings == 0 or savings_percentage < 1.0 -> 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(1.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([RETURN])
    b += bytes([END])
    # if savings_percentage < 10.0 -> 1
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(10.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([RETURN])
    b += bytes([END])
    # if savings_percentage < 20.0 -> 2
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(20.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(2)
    b += bytes([RETURN])
    b += bytes([END])
    # if savings_percentage <= 50.0 -> 3
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(50.0)
    b += bytes([F64_LE])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(3)
    b += bytes([RETURN])
    b += bytes([END])
    # else -> 4
    b += bytes([I32_CONST]) + encode_s32(4)
    wb.add_function("c_budget_status_code", [TYPE_F64, TYPE_F64], [TYPE_I32], [], bytes(b))

    # -------------------------------------------------------------
    # 6. c_prediction_future_value(init: f64, pmt: f64, rate: f64, months: i32) -> f64
    # Local vars:
    # 4: bal (f64), 5: monthly_rate (f64), 6: i (i32)
    # -------------------------------------------------------------
    b = bytearray()
    # if months <= 0 return init
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([I32_LE_S])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([RETURN])
    b += bytes([END])

    # monthly_rate = (rate / 100.0) / 12.0 = rate / 1200.0
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONST]) + encode_f64(1200.0)
    b += bytes([F64_DIV])
    b += bytes([LOCAL_SET]) + encode_u32(5)

    # bal = init
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_SET]) + encode_u32(4)

    # i = 0
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([LOCAL_SET]) + encode_u32(6)

    # loop
    b += bytes([BLOCK, TYPE_EMPTY])
    b += bytes([LOOP, TYPE_EMPTY])
    # if i >= months break
    b += bytes([LOCAL_GET]) + encode_u32(6)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I32_GE_S])
    b += bytes([BR_IF]) + encode_u32(1)

    # bal = bal * (1.0 + monthly_rate) + pmt
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([F64_CONST]) + encode_f64(1.0)
    b += bytes([LOCAL_GET]) + encode_u32(5)
    b += bytes([F64_ADD])
    b += bytes([F64_MUL])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_ADD])
    b += bytes([LOCAL_SET]) + encode_u32(4)

    # i++
    b += bytes([LOCAL_GET]) + encode_u32(6)
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([I32_ADD])
    b += bytes([LOCAL_SET]) + encode_u32(6)

    b += bytes([BR]) + encode_u32(0)
    b += bytes([END]) # end loop
    b += bytes([END]) # end block

    b += bytes([LOCAL_GET]) + encode_u32(4)
    wb.add_function("c_prediction_future_value", [TYPE_F64, TYPE_F64, TYPE_F64, TYPE_I32], [TYPE_F64],
                    [(2, TYPE_F64), (1, TYPE_I32)], bytes(b))

    # -------------------------------------------------------------
    # 7. c_prediction_total_contributed(init: f64, pmt: f64, months: i32) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONVERT_I32_S])
    b += bytes([F64_MUL])
    b += bytes([F64_ADD])
    wb.add_function("c_prediction_total_contributed", [TYPE_F64, TYPE_F64, TYPE_I32], [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 8. c_prediction_interest_earned(init: f64, pmt: f64, rate: f64, months: i32) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    # fv = call c_prediction_future_value (func_idx = 5)
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([CALL]) + encode_u32(5)
    # contributed = call c_prediction_total_contributed (func_idx = 6)
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([CALL]) + encode_u32(6)
    b += bytes([F64_SUB])
    # if interest < 0 return 0
    b += bytes([LOCAL_TEE]) + encode_u32(4)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([RETURN])
    b += bytes([END])
    b += bytes([LOCAL_GET]) + encode_u32(4)
    wb.add_function("c_prediction_interest_earned", [TYPE_F64, TYPE_F64, TYPE_F64, TYPE_I32], [TYPE_F64],
                    [(1, TYPE_F64)], bytes(b))

    # -------------------------------------------------------------
    # 9. c_prediction_validate(init: f64, pmt: f64, rate: f64, months: i32) -> i32
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(2)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONST]) + encode_f64(100.0)
    b += bytes([F64_GT])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(3)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([I32_LE_S])
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I32_CONST]) + encode_s32(600)
    b += bytes([I32_GT_S])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(4)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([I32_CONST]) + encode_s32(0)
    wb.add_function("c_prediction_validate", [TYPE_F64, TYPE_F64, TYPE_F64, TYPE_I32], [TYPE_I32], [], bytes(b))

    # -------------------------------------------------------------
    # 10. c_is_prime(n: i64) -> i32 (func_idx = 9)
    # Locals:
    # 1: i (i64)
    # -------------------------------------------------------------
    b = bytearray()
    # if n <= 1 return 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_LE_S])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([RETURN])
    b += bytes([END])

    # if n <= 3 return 1
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(3)
    b += bytes([I64_LE_S])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([RETURN])
    b += bytes([END])

    # if n % 2 == 0 or n % 3 == 0 return 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(2)
    b += bytes([I64_REM_S])
    b += bytes([I64_EQZ])
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(3)
    b += bytes([I64_REM_S])
    b += bytes([I64_EQZ])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([RETURN])
    b += bytes([END])

    # i = 5
    b += bytes([I64_CONST]) + encode_s64(5)
    b += bytes([LOCAL_SET]) + encode_u32(1)

    # loop
    b += bytes([BLOCK, TYPE_EMPTY])
    b += bytes([LOOP, TYPE_EMPTY])
    # if i * i > n break
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_MUL])
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_GT_S])
    b += bytes([BR_IF]) + encode_u32(1)

    # if n % i == 0 or n % (i + 2) == 0 return 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_REM_S])
    b += bytes([I64_EQZ])
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_CONST]) + encode_s64(2)
    b += bytes([I64_ADD])
    b += bytes([I64_REM_S])
    b += bytes([I64_EQZ])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([RETURN])
    b += bytes([END])

    # i += 6
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_CONST]) + encode_s64(6)
    b += bytes([I64_ADD])
    b += bytes([LOCAL_SET]) + encode_u32(1)
    b += bytes([BR]) + encode_u32(0)
    b += bytes([END])
    b += bytes([END])

    b += bytes([I32_CONST]) + encode_s32(1)
    wb.add_function("c_is_prime", [TYPE_I64], [TYPE_I32], [(1, TYPE_I64)], bytes(b))

    # -------------------------------------------------------------
    # 11. c_gcd(a: i64, b: i64) -> i64 (func_idx = 10)
    # Locals: 2: temp (i64)
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([BLOCK, TYPE_EMPTY])
    b += bytes([LOOP, TYPE_EMPTY])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_EQZ])
    b += bytes([BR_IF]) + encode_u32(1)

    # temp = b
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_SET]) + encode_u32(2)

    # b = a % b
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_REM_S])
    b += bytes([LOCAL_SET]) + encode_u32(1)

    # a = temp
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_SET]) + encode_u32(0)

    b += bytes([BR]) + encode_u32(0)
    b += bytes([END])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(0)
    wb.add_function("c_gcd", [TYPE_I64, TYPE_I64], [TYPE_I64], [(1, TYPE_I64)], bytes(b))

    # -------------------------------------------------------------
    # 12. c_rsa_compute_n(p: i64, q: i64) -> i64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_MUL])
    wb.add_function("c_rsa_compute_n", [TYPE_I64, TYPE_I64], [TYPE_I64], [], bytes(b))

    # -------------------------------------------------------------
    # 13. c_rsa_compute_totient(p: i64, q: i64) -> i64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_SUB])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_SUB])
    b += bytes([I64_MUL])
    wb.add_function("c_rsa_compute_totient", [TYPE_I64, TYPE_I64], [TYPE_I64], [], bytes(b))

    # -------------------------------------------------------------
    # 14. c_rsa_validate_e(e: i64, phi: i64) -> i32
    # -------------------------------------------------------------
    b = bytearray()
    # if e <= 1 or e >= phi return 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_LE_S])
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_GE_S])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([RETURN])
    b += bytes([END])

    # if gcd(e, phi) != 1 return 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([CALL]) + encode_u32(10) # c_gcd is func_idx 10
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_NE])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(0)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([I32_CONST]) + encode_s32(1)
    wb.add_function("c_rsa_validate_e", [TYPE_I64, TYPE_I64], [TYPE_I32], [], bytes(b))

    # -------------------------------------------------------------
    # 15. c_rsa_compute_d(e: i64, phi: i64) -> i64
    # Extended Euclidean algorithm
    # Locals:
    # 2: r0 (i64), 3: r1 (i64), 4: s0 (i64), 5: s1 (i64), 6: q (i64), 7: temp (i64)
    # -------------------------------------------------------------
    b = bytearray()
    # r0 = e, r1 = phi, s0 = 1, s1 = 0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_SET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_SET]) + encode_u32(3)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([LOCAL_SET]) + encode_u32(4)
    b += bytes([I64_CONST]) + encode_s64(0)
    b += bytes([LOCAL_SET]) + encode_u32(5)

    # loop while r1 != 0
    b += bytes([BLOCK, TYPE_EMPTY])
    b += bytes([LOOP, TYPE_EMPTY])
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I64_EQZ])
    b += bytes([BR_IF]) + encode_u32(1)

    # q = r0 / r1
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I64_DIV_S])
    b += bytes([LOCAL_SET]) + encode_u32(6)

    # temp = r0 - q * r1; r0 = r1; r1 = temp
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(6)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I64_MUL])
    b += bytes([I64_SUB])
    b += bytes([LOCAL_SET]) + encode_u32(7)

    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([LOCAL_SET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(7)
    b += bytes([LOCAL_SET]) + encode_u32(3)

    # temp = s0 - q * s1; s0 = s1; s1 = temp
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([LOCAL_GET]) + encode_u32(6)
    b += bytes([LOCAL_GET]) + encode_u32(5)
    b += bytes([I64_MUL])
    b += bytes([I64_SUB])
    b += bytes([LOCAL_SET]) + encode_u32(7)

    b += bytes([LOCAL_GET]) + encode_u32(5)
    b += bytes([LOCAL_SET]) + encode_u32(4)
    b += bytes([LOCAL_GET]) + encode_u32(7)
    b += bytes([LOCAL_SET]) + encode_u32(5)

    b += bytes([BR]) + encode_u32(0)
    b += bytes([END])
    b += bytes([END])

    # if r0 != 1 return -1
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_NE])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I64_CONST]) + encode_s64(-1)
    b += bytes([RETURN])
    b += bytes([END])

    # return (s0 % phi + phi) % phi
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_REM_S])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_ADD])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_REM_S])

    wb.add_function("c_rsa_compute_d", [TYPE_I64, TYPE_I64], [TYPE_I64], [(6, TYPE_I64)], bytes(b))

    # -------------------------------------------------------------
    # 16. c_rsa_encrypt_msg(message: i64, e: i64, n: i64) -> i64 (func_idx = 15)
    # Binary modular exponentiation: (message^e) % n
    # Locals:
    # 3: res (i64), 4: base (i64), 5: exp (i64)
    # -------------------------------------------------------------
    b = bytearray()
    # if n <= 1 return -1
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_LE_S])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I64_CONST]) + encode_s64(-1)
    b += bytes([RETURN])
    b += bytes([END])

    # res = 1
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([LOCAL_SET]) + encode_u32(3)

    # base = message % n
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([I64_REM_S])
    b += bytes([LOCAL_SET]) + encode_u32(4)

    # exp = e
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_SET]) + encode_u32(5)

    # loop while exp > 0
    b += bytes([BLOCK, TYPE_EMPTY])
    b += bytes([LOOP, TYPE_EMPTY])
    b += bytes([LOCAL_GET]) + encode_u32(5)
    b += bytes([I64_CONST]) + encode_s64(0)
    b += bytes([I64_LE_S])
    b += bytes([BR_IF]) + encode_u32(1)

    # if exp & 1: res = (res * base) % n
    b += bytes([LOCAL_GET]) + encode_u32(5)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_AND])
    b += bytes([I64_EQZ])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([ELSE])
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([I64_MUL])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([I64_REM_S])
    b += bytes([LOCAL_SET]) + encode_u32(3)
    b += bytes([END])

    # base = (base * base) % n
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([I64_MUL])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([I64_REM_S])
    b += bytes([LOCAL_SET]) + encode_u32(4)

    # exp = exp >> 1
    b += bytes([LOCAL_GET]) + encode_u32(5)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_SHR_U])
    b += bytes([LOCAL_SET]) + encode_u32(5)

    b += bytes([BR]) + encode_u32(0)
    b += bytes([END])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(3)
    wb.add_function("c_rsa_encrypt_msg", [TYPE_I64, TYPE_I64, TYPE_I64], [TYPE_I64], [(3, TYPE_I64)], bytes(b))

    # -------------------------------------------------------------
    # 17. c_rsa_decrypt_msg(cipher: i64, d: i64, n: i64) -> i64 (func_idx = 16)
    # Same as mod_pow(cipher, d, n)
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([CALL]) + encode_u32(15) # calls func_idx 15 (c_rsa_encrypt_msg)
    wb.add_function("c_rsa_decrypt_msg", [TYPE_I64, TYPE_I64, TYPE_I64], [TYPE_I64], [], bytes(b))

    # -------------------------------------------------------------
    # 18. c_rsa_validate_all(p: i64, q: i64, e: i64, msg: i64) -> i32
    # -------------------------------------------------------------
    b = bytearray()
    # check is_prime(p)
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([CALL]) + encode_u32(9) # c_is_prime
    b += bytes([I32_EQZ])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([RETURN])
    b += bytes([END])

    # check is_prime(q)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([CALL]) + encode_u32(9)
    b += bytes([I32_EQZ])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(2)
    b += bytes([RETURN])
    b += bytes([END])

    # check p == q
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_EQ])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(3)
    b += bytes([RETURN])
    b += bytes([END])

    # phi = (p - 1) * (q - 1)
    # check validate_e(e, phi)
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_SUB])
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_CONST]) + encode_s64(1)
    b += bytes([I64_SUB])
    b += bytes([I64_MUL])
    b += bytes([CALL]) + encode_u32(13) # c_rsa_validate_e
    b += bytes([I32_EQZ])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(4)
    b += bytes([RETURN])
    b += bytes([END])

    # check msg < 0
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([I64_CONST]) + encode_s64(0)
    b += bytes([I64_LT_S])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(6)
    b += bytes([RETURN])
    b += bytes([END])

    # check msg >= n (n = p * q)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([I64_MUL])
    b += bytes([I64_GE_S])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(5)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([I32_CONST]) + encode_s32(0)
    wb.add_function("c_rsa_validate_all", [TYPE_I64, TYPE_I64, TYPE_I64, TYPE_I64], [TYPE_I32], [], bytes(b))

    # -------------------------------------------------------------
    # 19. c_simulator_monthly_savings(income: f64, expenses: f64) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_SUB])
    wb.add_function("c_simulator_monthly_savings", [TYPE_F64, TYPE_F64], [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 20. c_simulator_period_savings(income: f64, expenses: f64, months: i32) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_SUB])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONVERT_I32_S])
    b += bytes([F64_MUL])
    wb.add_function("c_simulator_period_savings", [TYPE_F64, TYPE_F64, TYPE_I32], [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 21. c_simulator_savings_diff(inc_a, exp_a, inc_b, exp_b, months) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    # (inc_b - exp_b) - (inc_a - exp_a) * months
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([F64_SUB])
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_SUB])
    b += bytes([F64_SUB])
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([F64_CONVERT_I32_S])
    b += bytes([F64_MUL])
    wb.add_function("c_simulator_savings_diff", [TYPE_F64, TYPE_F64, TYPE_F64, TYPE_F64, TYPE_I32], [TYPE_F64], [], bytes(b))

    # -------------------------------------------------------------
    # 22. c_simulator_improvement_pct(inc_a, exp_a, inc_b, exp_b) -> f64
    # -------------------------------------------------------------
    b = bytearray()
    # sav_a = inc_a - exp_a
    # if sav_a <= 0 return -999.0
    # else return ((sav_b - sav_a) / sav_a) * 100.0
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_SUB])
    b += bytes([LOCAL_TEE]) + encode_u32(4) # local 4 = sav_a
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LE])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([F64_CONST]) + encode_f64(-999.0)
    b += bytes([RETURN])
    b += bytes([END])

    # sav_b = inc_b - exp_b
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([F64_SUB])
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([F64_SUB]) # sav_b - sav_a
    b += bytes([LOCAL_GET]) + encode_u32(4)
    b += bytes([F64_DIV])
    b += bytes([F64_CONST]) + encode_f64(100.0)
    b += bytes([F64_MUL])

    wb.add_function("c_simulator_improvement_pct", [TYPE_F64, TYPE_F64, TYPE_F64, TYPE_F64], [TYPE_F64],
                    [(1, TYPE_F64)], bytes(b))

    # -------------------------------------------------------------
    # 23. c_simulator_validate(inc_a, exp_a, inc_b, exp_b) -> i32
    # -------------------------------------------------------------
    b = bytearray()
    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(1)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(1)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([LOCAL_GET]) + encode_u32(3)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_LT])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(2)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([LOCAL_GET]) + encode_u32(0)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_EQ])
    b += bytes([LOCAL_GET]) + encode_u32(2)
    b += bytes([F64_CONST]) + encode_f64(0.0)
    b += bytes([F64_EQ])
    b += bytes([I32_OR])
    b += bytes([IF, TYPE_EMPTY])
    b += bytes([I32_CONST]) + encode_s32(3)
    b += bytes([RETURN])
    b += bytes([END])

    b += bytes([I32_CONST]) + encode_s32(0)
    wb.add_function("c_simulator_validate", [TYPE_F64, TYPE_F64, TYPE_F64, TYPE_F64], [TYPE_I32], [], bytes(b))

    return wb.build()

if __name__ == "__main__":
    os.makedirs("wasm", exist_ok=True)
    wasm_bytes = build_securesave_wasm()
    wasm_path = os.path.join("wasm", "securesave.wasm")
    with open(wasm_path, "wb") as f:
        f.write(wasm_bytes)
    print(f"Generated {wasm_path} ({len(wasm_bytes)} bytes)")

