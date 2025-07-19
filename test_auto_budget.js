const axios = require('axios');

// Test script for auto budgeting functionality
async function testAutoBudget() {
  try {
    console.log('Testing auto budgeting functionality...');
    
    // Test 1: Check transaction summary API
    console.log('\n1. Testing transaction summary API...');
    const summaryResponse = await axios.get('http://localhost:5000/api/transactions/summary?interval=monthly', {
      headers: { 
        Authorization: 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Summary response structure:', {
      hasData: !!summaryResponse.data.data,
      dataLength: summaryResponse.data.data?.length,
      sampleData: summaryResponse.data.data?.[0]
    });
    
    // Test 2: Check if monthly data includes year information
    console.log('\n2. Checking year information in monthly data...');
    const monthlyData = summaryResponse.data.data || [];
    const hasYearInfo = monthlyData.some(item => item.hasOwnProperty('year'));
    console.log('Monthly data includes year information:', hasYearInfo);
    
    if (hasYearInfo) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentMonthData = monthlyData.find(d => d.label === currentMonth && d.year === currentYear);
      console.log('Current month data found:', !!currentMonthData);
      if (currentMonthData) {
        console.log('Current month income:', currentMonthData.income);
      }
    }
    
    // Test 3: Test budget creation with month parameter
    console.log('\n3. Testing budget creation with month parameter...');
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const budgetResponse = await axios.post('http://localhost:5000/api/budget', {
      categoryName: 'Test Category',
      budget: 1000,
      month: currentMonth
    }, {
      headers: { 
        Authorization: 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Budget creation response:', budgetResponse.data);
    
    console.log('\n✅ Auto budgeting test completed successfully!');
    
  } catch (error) {
    console.error('❌ Auto budgeting test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAutoBudget(); 