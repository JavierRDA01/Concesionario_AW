const dealershipDataAccess = require('../data/dealerships');

exports.createDealership = async (dealership) => {
    dealershipDataAccess.saveDealership(dealership)
}