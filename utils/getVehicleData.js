const axios = require('axios');

const options = {
  method: 'POST',
  url: 'https://vehicle-information-verification-rto-india.p.rapidapi.com/rc-full',
  headers: {
    'x-rapidapi-key': '6905646312msh565c7a89fa70cd2p12ebdfjsn237ab9e19891',
    'x-rapidapi-host': 'vehicle-information-verification-rto-india.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  data: {
    id_number: 'KL18Y6394'
  }
};

async function getVehicleData() {
  try {
    const response = await axios.request(options);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

// Call the async function
getVehicleData();
