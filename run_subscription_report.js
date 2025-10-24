const { getSubscriptionReport } = require('./config/agenda');

async function runReport() {
  console.log('🚀 Running subscription report...\n');

  try {
    const report = await getSubscriptionReport();
    console.log('\n✅ Report completed successfully!');

    // Also show JSON format for easy copying
    console.log('\n📄 JSON FORMAT:');
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('❌ Error running report:', error);
  }
}

runReport();
