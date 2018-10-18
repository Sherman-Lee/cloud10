/*
    Version 1.0.1
    Before running this example, install necessary dependencies by running:
    npm install http-signature jssha
*/

var fs = require('fs');
var https = require('https');
var os = require('os');
var httpSignature = require('http-signature');
var jsSHA = require("jssha");


// TODO: update these values to your own
var tenancyId = "ocid1.tenancy.oc1..aaaaaaaack2t7isiopdukyfcomarcuifnphvixrqngw67yzl5t7mvuicr26q";
var authUserId = "ocid1.user.oc1..aaaaaaaa46yec4yjjfktx746656kptwabm5were4tbtil5vsiieaj2mohlgq";
var keyFingerprint = "98:ac:f2:69:f5:cf:61:58:81:f6:21:15:f6:3f:21:64";
var privateKeyPath = "~/.oci/oci_api_key.pem";

var identityDomain = "identity.us-ashburn-1.oraclecloud.com";
var coreServicesDomain = "iaas.us-ashburn-1.oraclecloud.com";
var objectStorageDomain = "objectstorage.us-ashburn-1.oraclecloud.com";

var e_user = "MarketingCloud33\\eloqua.config"
var e_pass = "settledLoss5!";
var e_authHeader = "Basic " + new Buffer.from(e_user + ":" + e_pass).toString('base64');

if(privateKeyPath.indexOf("~/") === 0) {
    privateKeyPath = privateKeyPath.replace("~", os.homedir())
}
var privateKey = fs.readFileSync(privateKeyPath, 'ascii');


// signing function as described at https://docs.cloud.oracle.com/Content/API/Concepts/signingrequests.htm
function sign(request, options) {

    var apiKeyId = options.tenancyId + "/" + options.userId + "/" + options.keyFingerprint;

    var headersToSign = [
        "host",
        "date",
        "(request-target)"
    ];

    var methodsThatRequireExtraHeaders = ["POST", "PUT"];

    if(methodsThatRequireExtraHeaders.indexOf(request.method.toUpperCase()) !== -1) {
        options.body = options.body || "";

        var shaObj = new jsSHA("SHA-256", "TEXT");
        shaObj.update(options.body);

        request.setHeader("Content-Length", options.body.length);
        request.setHeader("x-content-sha256", shaObj.getHash('B64'));

        headersToSign = headersToSign.concat([
            "content-type",
            "content-length",
            "x-content-sha256"
        ]);
    }

    httpSignature.sign(request, {
        key: options.privateKey,
        keyId: apiKeyId,
        headers: headersToSign
    });

    var newAuthHeaderValue = request.getHeader("Authorization").replace("Signature ", "Signature version=\"1\",");
    request.setHeader("Authorization", newAuthHeaderValue);
}

// generates a function to handle the https.request response object
function handleRequest(callback) {

    return function(response) {
        var responseBody = "";

        response.on('data', function(chunk) {
        responseBody += chunk;  
        console.log('statusCode:', response.statusCode);
        // console.log('headers:', response.headers);
    });

        response.on('end', function() {
            callback(JSON.parse(responseBody));
        });
    }
}

// generates a function to handle the https.request response object
function handleCSVRequest(callback) {

    return function(response) {
        var responseBody = "";

        response.on('data', function(chunk) {
        responseBody += chunk;
    });

        response.on('end', function() {
            console.log(responseBody);
            fs.writeFile('output.csv', responseBody, (err) => {  
                // throws an error, you could also catch it here
                if (err) throw err;
            });
        });
    }
}

// gets the user with the specified id
function getUser(userId, callback) {

    var options = {
        host: identityDomain,
        path: "/20160918/users/" + encodeURIComponent(userId),
    };

    var request = https.request(options, handleRequest(callback));

    sign(request, {
        privateKey: privateKey,
        keyFingerprint: keyFingerprint,
        tenancyId: tenancyId,
        userId: authUserId
    });

    request.end();
};

// creates a Oracle Cloud Infrastructure VCN in the specified compartment
function createVCN(compartmentId, displayName, cidrBlock, callback) {
    
    var body = JSON.stringify({
        compartmentId: compartmentId,
        displayName: displayName,
        cidrBlock: cidrBlock
    });

    var options = {
        host: coreServicesDomain,
        path: '/20160918/vcns',
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        }
    };

    var request = https.request(options, handleRequest(callback));

    sign(request, {
        body: body,
        privateKey: privateKey,
        keyFingerprint: keyFingerprint,
        tenancyId: tenancyId,
        userId: authUserId
    });

    request.end(body);
};

function downloadObject(callback) {
    var body = JSON.stringify({
    });

    var options = {
        host: objectStorageDomain,
        path: '/n/smcloud10/b/bdcsbk/o/supermart/output.csv',
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
        }
    };

    var request = https.request(options, handleCSVRequest(callback));

    sign(request, {
        body: body,
        privateKey: privateKey,
        keyFingerprint: keyFingerprint,
        tenancyId: tenancyId,
        userId: authUserId
    });

    request.end(body);
}

function eloquaCustomObjects(callback) {
    var body = JSON.stringify({
    });

    var options = {
        host: 'secure.p03.eloqua.com',
        path: '/api/bulk/2.0/customObjects',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': e_authHeader
        }
    };

    var request = https.request(options, handleRequest(callback));

    request.end();
}

/*
// test the above functions
console.log("GET USER:");

getUser(authUserId, function(data) {
    console.log(data);
        
    console.log("\nCREATING VCN:");

    // TODO: replace this with a compartment you have access to
    var compartmentIdToCreateVcnIn = tenancyId;

    createVCN(compartmentIdToCreateVcnIn, "Test-VCN", "10.0.0.0/16", function(data) {
        console.log(data);
    });
});
*/

downloadObject(function(data) {});

/*eloquaCustomObjects(function(data) {
    console.log(data);
});*/

