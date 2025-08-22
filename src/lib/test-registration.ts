/**
 * Simple test script to verify the registration API endpoint
 * Run this with: pnpm tsx src/lib/test-registration.ts
 */

async function testRegistration() {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123',
  };

  console.log('🧪 Testing registration API...');
  console.log('Test user:', { ...testUser, password: '[HIDDEN]' });

  try {
    const response = await fetch('http://localhost:3005/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Registration successful!');
      console.log('Created user:', data.user);
    } else {
      console.log('❌ Registration failed:');
      console.log('Status:', response.status);
      console.log('Response:', data);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Test validation functions
async function testValidation() {
  console.log('\n🧪 Testing validation...');

  const testCases = [
    {
      name: 'Invalid email',
      data: { email: 'invalid-email', password: 'TestPassword123' },
      shouldFail: true,
    },
    {
      name: 'Weak password',
      data: { email: 'test@example.com', password: 'weak' },
      shouldFail: true,
    },
    {
      name: 'Valid data',
      data: { email: 'valid@example.com', password: 'ValidPassword123' },
      shouldFail: false,
    },
  ];

  for (const testCase of testCases) {
    try {
      const response = await fetch('http://localhost:3005/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const data = await response.json();
      const failed = !response.ok || !data.success;

      if (testCase.shouldFail && failed) {
        console.log(`✅ ${testCase.name}: Correctly rejected`);
        console.log(`   Message: ${data.message}`);
      } else if (!testCase.shouldFail && !failed) {
        console.log(`✅ ${testCase.name}: Correctly accepted`);
      } else {
        console.log(`❌ ${testCase.name}: Unexpected result`);
        console.log(
          `   Expected to ${testCase.shouldFail ? 'fail' : 'succeed'}`
        );
        console.log(`   Response:`, data);
      }
    } catch (error) {
      console.error(`❌ ${testCase.name}: Network error:`, error);
    }
  }
}

async function main() {
  console.log('🚀 Starting registration tests...');
  console.log(
    'Make sure the development server is running on http://localhost:3005\n'
  );

  await testValidation();
  await testRegistration();

  console.log('\n✨ Tests completed!');
}

if (require.main === module) {
  main();
}
