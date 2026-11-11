/**
 * SecureSave - Mathematical Security System (RSA) Implementation
 * Educational small-number RSA demonstration.
 * 
 * NOTE: For educational purposes only. Small-number RSA is easily factorable
 * and NOT suitable for real-world cryptographic applications.
 */

#include "encryption.h"
#include "math_utils.h"

int64_t rsa_compute_n(int64_t p, int64_t q) {
    if (p <= 0 || q <= 0) return 0;
    return p * q;
}

int64_t rsa_compute_totient(int64_t p, int64_t q) {
    if (p <= 1 || q <= 1) return 0;
    return (p - 1) * (q - 1);
}

int rsa_validate_e(int64_t e, int64_t phi) {
    if (e <= 1 || e >= phi) {
        return 0; /* Out of valid range (1, phi) */
    }
    if (gcd(e, phi) != 1) {
        return 0; /* Not coprime to phi */
    }
    return 1; /* Valid */
}

int64_t rsa_compute_d(int64_t e, int64_t phi) {
    if (!rsa_validate_e(e, phi)) {
        return -1;
    }
    return mod_inverse(e, phi);
}

int64_t rsa_encrypt_msg(int64_t message, int64_t e, int64_t n) {
    if (n <= 1 || message < 0 || message >= n) {
        return -1; /* Invalid message size */
    }
    return mod_pow(message, e, n);
}

int64_t rsa_decrypt_msg(int64_t cipher, int64_t d, int64_t n) {
    if (n <= 1 || cipher < 0 || cipher >= n || d <= 0) {
        return -1;
    }
    return mod_pow(cipher, d, n);
}

int rsa_validate_all(int64_t p, int64_t q, int64_t e, int64_t message) {
    if (!is_prime(p)) return 1;
    if (!is_prime(q)) return 2;
    if (p == q) return 3;

    int64_t phi = (p - 1) * (q - 1);
    if (!rsa_validate_e(e, phi)) return 4;

    int64_t n = p * q;
    if (message < 0) return 6;
    if (message >= n) return 5;

    return 0;
}

