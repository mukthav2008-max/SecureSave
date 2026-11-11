/**
 * SecureSave - Mathematical Utilities Implementation
 * Contains algorithms for Euclidean GCD, Extended Euclidean Algorithm,
 * Modular Exponentiation, and Primality Testing.
 */

#include "math_utils.h"
#include <math.h>

int is_prime(int64_t n) {
    if (n <= 1) return 0;
    if (n <= 3) return 1;
    if (n % 2 == 0 || n % 3 == 0) return 0;

    for (int64_t i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) {
            return 0;
        }
    }
    return 1;
}

int64_t gcd(int64_t a, int64_t b) {
    if (a < 0) a = -a;
    if (b < 0) b = -b;
    while (b != 0) {
        int64_t temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int64_t extended_gcd(int64_t a, int64_t b, int64_t *x, int64_t *y) {
    if (b == 0) {
        *x = 1;
        *y = 0;
        return a;
    }
    int64_t x1, y1;
    int64_t d = extended_gcd(b, a % b, &x1, &y1);
    *x = y1;
    *y = x1 - y1 * (a / b);
    return d;
}

int64_t mod_inverse(int64_t a, int64_t m) {
    int64_t x, y;
    int64_t g = extended_gcd(a, m, &x, &y);
    if (g != 1) {
        /* Inverse does not exist (not coprime) */
        return -1;
    }
    /* Ensure result is in range [1, m - 1] */
    return (x % m + m) % m;
}

int64_t mod_mul(int64_t a, int64_t b, int64_t mod) {
    a %= mod;
    b %= mod;
    int64_t res = 0;
    while (b > 0) {
        if (b & 1) {
            res = (res + a) % mod;
        }
        a = (a + a) % mod;
        b >>= 1;
    }
    return res;
}

int64_t mod_pow(int64_t base, int64_t exp, int64_t mod) {
    if (mod <= 1) return 0;
    base %= mod;
    int64_t res = 1;
    while (exp > 0) {
        if (exp & 1) {
            res = mod_mul(res, base, mod);
        }
        base = mod_mul(base, base, mod);
        exp >>= 1;
    }
    return res;
}

double safe_abs(double val) {
    return val < 0.0 ? -val : val;
}

double safe_pow(double base, int exp) {
    double res = 1.0;
    int p = exp >= 0 ? exp : -exp;
    while (p > 0) {
        if (p & 1) res *= base;
        base *= base;
        p >>= 1;
    }
    return exp < 0 ? (1.0 / res) : res;
}

