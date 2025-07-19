const axios = require('axios');

// Test script for savings goals functionality
async function testSavingsGoals() {
  try {
    console.log('Testing savings goals functionality...');
    
    // Test 1: Set a savings goal
    console.log('\n1. Testing set savings goal...');
    const setGoalResponse = await axios.post('http://localhost:5000/api/savings/goal', {
      initialGoal: 5000
    }, {
      headers: { 
        Authorization: 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Set goal response:', setGoalResponse.data);
    
    // Test 2: Get savings goal status
    console.log('\n2. Testing get savings goal...');
    const getGoalResponse = await axios.get('http://localhost:5000/api/savings/goal', {
      headers: { 
        Authorization: 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Get goal response:', getGoalResponse.data);
    
    // Test 3: Get monthly savings
    console.log('\n3. Testing get monthly savings...');
    const monthlySavingsResponse = await axios.get('http://localhost:5000/api/savings/monthly', {
      headers: { 
        Authorization: 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Monthly savings response:', monthlySavingsResponse.data);
    
    // Test 4: Store current month savings
    console.log('\n4. Testing store current month savings...');
    const storeSavingsResponse = await axios.post('http://localhost:5000/api/savings/month-end', {}, {
      headers: { 
        Authorization: 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Store savings response:', storeSavingsResponse.data);
    
    console.log('\n✅ Savings goals test completed successfully!');
    
  } catch (error) {
    console.error('❌ Savings goals test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSavingsGoals(); 