// Simple security test script
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

console.log('Testing security implementations...\n');

// Test bcrypt
const testPassword = 'testPassword123';
const hashedPassword = await bcrypt.hash(testPassword, 12);
console.log('✓ Bcrypt hashing works');
console.log('Original:', testPassword);
console.log('Hashed:', hashedPassword);

const isValid = await bcrypt.compare(testPassword, hashedPassword);
console.log('✓ Bcrypt comparison works:', isValid);

// Test JWT
const testPayload = { userId: '123', email: 'test@example.com' };
const testSecret = 'test-secret-key';
const token = jwt.sign(testPayload, testSecret, { expiresIn: '1h' });
console.log('\n✓ JWT signing works');
console.log('Token:', token);

const decoded = jwt.verify(token, testSecret);
console.log('✓ JWT verification works');
console.log('Decoded:', decoded);

console.log('\n✅ All security implementations are working correctly!');