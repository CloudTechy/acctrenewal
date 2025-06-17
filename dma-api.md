TABLE OF CONTENTS

new_user
edit_user
del_user
get_userdata
send_pod
add_credits
get_remaining
send_sms
send_email
get_srv
get_refillcard

--------------------------------------------------------------------------------

NAME
    new_user - Register a new user account (1.0)

FUNCTION
    Register a new user account with the given parameters.

INPUTS
    apiuser	  - API user name (mandatory)
    apipass	  - API user password (mandatory)
    username	  - new user name (mandatory)
    password	  - password for new user
    enabled	  - 1 = enabled
    acctype	  - account type (REGULAR = 0
  				  MACONLY = 1
  				  CARDUSER = 2
				  ACLMIKROTIK = 3
  				  ACLSTAROS = 4
				  IAS = 5
				  DOCSIS = 6)
    srvid	  - service id
    simuse	  - simultaneous use value
    usemacauth	  - enable MAC authentication
    maccpe	  - CPE MAC address
    maccm	  - CM MAC address
    groupid	  - group id
    custattr	  - custom RADIUS attributes
    owner	  - account owner
    staticipcm	  - CM static IP
    staticipcpe	  - CPE static IP
    ipmodecm	  - CM IP mode  (1 - IP pool
    			         2 - static)
    ipmodecpe	  - CPE IP mode (0 - NAS pool or DHCP
    				 1 - IP pool
    				 2 - static)
    poolidcm	  - CM IP pool id
    poolidcpe	  - CPE IP pool id
    dlbytes	  - available download bytes
    ulbytes	  - available upload bytes
    totalbytes	  - available total bytes
    expiry	  - account expiry date (YYYY-MM-DD)
    onlinetime    - available online time in seconds
    credits	  - available credits (balance)
    contractid	  - contract id
    contractvalid - contract valid till date (YYYY-MM-DD)
    cnic	  - CNIC number
    firstname	  - first name
    lastname	  - last name
    company	  - company name
    address	  - address
    city	  - city
    zip		  - ZIP
    country	  - country
    state	  - state
    phone	  - phone number
    mobile	  - cell number
    email	  - email address
    comment	  - comment
    taxid	  - TAX identifier
    gpslong	  - GPS longitude
    gpslat	  - GPS latitude
    lang	  - default language for account

RESULT
    JSON array (code, str)
    
    code - 0 = SUCCESS, 1 = ERROR
    str  - result string

NOTES
    None

--------------------------------------------------------------------------------    
    
NAME
    edit_user - Edit user account (1.0)

FUNCTION
    Change user account data.

INPUTS
    apiuser	  - API user name (mandatory)
    apipass	  - API user password (mandatory)
    username	  - new user name (mandatory)
    password	  - password for new user
    enabled	  - 1 = enabled
    srvid	  - service id
    simuse	  - simultaneous use value
    usemacauth	  - enable MAC authentication
    maccpe	  - CPE MAC address
    maccm	  - CM MAC address
    groupid	  - group id
    custattr	  - custom RADIUS attributes
    owner	  - account owner
    staticipcm	  - CM static IP
    staticipcpe	  - CPE static IP
    ipmodecm	  - CM IP mode  (1 - IP pool
    			         2 - static)
    ipmodecpe	  - CPE IP mode (0 - NAS pool or DHCP
    				 1 - IP pool
    				 2 - static)
    poolidcm	  - CM IP pool id
    poolidcpe	  - CPE IP pool id
    dlbytes	  - available download bytes
    ulbytes	  - available upload bytes
    totalbytes	  - available total bytes
    expiry	  - account expiry date (YYYY-MM-DD)
    onlinetime    - available online time in seconds
    credits	  - available credits (balance)
    contractid	  - contract id
    contractvalid - contract valid till date (YYYY-MM-DD)
    cnic	  - CNIC number
    firstname	  - first name
    lastname	  - last name
    company	  - company name
    address	  - address
    city	  - city
    zip		  - ZIP
    country	  - country
    state	  - state
    phone	  - phone number
    mobile	  - cell number
    email	  - email address
    comment	  - comment
    taxid	  - TAX identifier
    gpslong	  - GPS longitude
    gpslat	  - GPS latitude
    lang	  - default language for account
    alertemail	  - Email alerts (0 - disabled, 1 - enabled)
    alertsms	  - SMS alerts (0 - disabled, 1 - enabled)
    warningsent	  - Alert sent (0 - not sent, 1 - sent)
    verified	  - Account is verified (0 - not verified, 1 - verified)
    verifyfails	  - Failed verification attempts
    verifysentnum - Sent verification codes
    pswactsmsnum  - Sent password codes

RESULT
    JSON array (code, str)
    
    code - 0 = SUCCESS, 1 = ERROR
    str  - result string

NOTES
    None

--------------------------------------------------------------------------------

NAME
    del_user - Delete user account (1.0)

FUNCTION
    Delete the specified user account.

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    username	- user name (mandatory)

RESULT
    JSON array (code, str)
    
    code - 0 = SUCCESS, 1 = ERROR
    str  - result string

NOTES
    None

--------------------------------------------------------------------------------

NAME
    get_userdata - Get user details (1.0)

FUNCTION
    Return the user details from the database

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    username	- user name (mandatory)

RESULT
    JSON array (code, enableuser, srvid, usemacauth, mac, maccm, groupid, custattr, owner,
    		staticipcm, staticipcpe, ipmodecm, ipmodecpe, poolidcm, poolidcpe, credits,
    		contractid, contractvalid, cnic, firstname, lastname, company, address, city,
    		zip, country, state, phone, mobile, email, comment, taxid, gpslong, gpslat,
    		lang, alertemail, alertsms, warningsent, verified, verifyfails, verifysentnum,
    		pswactsmsnum, simuse, dlbytes, ulbytes, totalbytes, onlinetime, expiry,
    		array[](nasipaddress, cpeipaddress, ap)
    		) = SUCCESS
    JSON array (code, str) = FAILURE

    str  	  - result string
    code          - 0 = SUCCESS, 1 = ERROR
    enableuser	  - 1 = enabled
    srvid	  - service id
    usemacauth	  - enable MAC authentication
    mac		  - CPE MAC address
    maccm	  - CM MAC address
    groupid	  - group id
    custattr	  - custom RADIUS attributes
    owner	  - account owner
    staticipcm	  - CM static IP
    staticipcpe	  - CPE static IP
    ipmodecm	  - CM IP mode  (1 - IP pool
    			         2 - static)
    ipmodecpe	  - CPE IP mode (0 - NAS pool or DHCP
    				 1 - IP pool
    				 2 - static)
    poolidcm	  - CM IP pool id
    poolidcpe	  - CPE IP pool id
    credits	  - available credits (balance)
    contractid	  - contract id
    contractvalid - contract valid till date (YYYY-MM-DD)
    cnic	  - CNIC number
    firstname	  - first name
    lastname	  - last name
    company	  - company name
    address	  - address
    city	  - city
    zip		  - ZIP
    country	  - country
    state	  - state
    phone	  - phone number
    mobile	  - cell number
    email	  - email address
    comment	  - comment
    taxid	  - TAX identifier
    gpslong	  - GPS longitude
    gpslat	  - GPS latitude
    lang	  - default language for account
    alertemail	  - Email alerts (0 - disabled, 1 - enabled)
    alertsms	  - SMS alerts (0 - disabled, 1 - enabled)
    warningsent	  - Alert sent (0 - not sent, 1 - sent)
    verified	  - Account is verified (0 - not verified, 1 - verified)
    verifyfails	  - Failed verification attempts
    verifysentnum - Sent verification codes
    pswactsmsnum  - Sent password codes
    simuse	  - simultaneous use value
    dlbytes       - available download Bytes
    ulbytes       - available upload Bytes
    totalbytes    - available total Bytes
    onlinetime    - available online time
    expiry        - expiry date and time
    nasipaddress  - current NAS IP address
    cpeipaddress  - assigned CPE IP address
    ap            - current AP id
    
NOTES
    Every online session has a separate array with NAS IP address and CPE IP address.
    If the status array is blank, then no active sessions found for the given user.

--------------------------------------------------------------------------------

NAME
    send_pod - Terminate user session (1.0)

FUNCTION
    Send POD packet to NAS for the specified user.

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    username	- user name (mandatory)

RESULT
    JSON array (code, str)
    
    code - 0 = SUCCESS, 1 = ERROR
    str  - result string

NOTES
    None

--------------------------------------------------------------------------------

NAME
    add_credits - Add credits to user (1.0)

FUNCTION
    Add credits to user account. Upon successful completion the function returns
    the remaining traffic/time for the account.

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    username	- user name (mandatory)
    dlbytes	- download traffic (Bytes)
    ulbytes	- upload traffic (Bytes)
    totalbytes	- total traffic (Bytes)
    expiry	- expiry interval (numeric)
    unit	- expiry unit (MONTH, DAY, HOUR, MINUTE)
    onlinetime	- online time (seconds)

RESULT
    JSON array (code, dlbytes, ulbytes, totalbytes, onlinetime, expirydate) = SUCCESS
    JSON array (code, str) = FAILURE
    
    code       - 0 = SUCCESS, 1 = ERROR
    str        - result string
    dlbytes    - available download Bytes
    ulbytes    - available upload Bytes
    totalbytes - available total Bytes
    onlinetime - available online time
    expirydate - expiry date and time

NOTES
    Result structure is changed in 4.7.0

--------------------------------------------------------------------------------

NAME
    get_remaining - Get remaining credits (1.0)

FUNCTION
    Returns the remaining traffic/time. 

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    username	- user name (mandatory)

RESULT
    JSON array (code, dlbytes, ulbytes, totalbytes, onlinetime, expirydate) = SUCCESS
    JSON array (code, str) = FAILURE
    
    code       - 0 = SUCCESS, 1 = ERROR
    str        - result string
    dlbytes    - available download Bytes
    ulbytes    - available upload Bytes
    totalbytes - available total Bytes
    onlinetime - available online time
    expirydate - expiry date and time
    
NOTES
    Result structure is changed in 4.7.0

--------------------------------------------------------------------------------

NAME
    send_sms - Send SMS (1.0)

FUNCTION
    Send SMS message to the specified cell phone number.

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    recp	- cell number
    body	- message

RESULT
    JSON array (code, str)
    
    code - 0 = SUCCESS, 1 = ERROR
    str  - result string

NOTES
    None

--------------------------------------------------------------------------------

NAME
    send_email - Send email (1.0)

FUNCTION
    Send message to the specified email address.

INPUTS
    apiuser	- API user name (mandatory)
    apipass	- API user password (mandatory)
    recp	- email address
    subj	- message subject
    body	- message body

RESULT
    JSON array (code, str)
    
    code - 0 = SUCCESS, 1 = ERROR
    str  - result string

NOTES
    None

--------------------------------------------------------------------------------

NAME
    get_srv - Get service plan details (1.0)

FUNCTION
    Get service plan details for the given srvid. If srvid is not specified, it
    return the list and details of all service plans, available in the system.

INPUTS
    apiuser - API user name (mandatory)
    apipass - API user password (mandatory)
    srvid   - service id

RESULT
    JSON array (code, srvid, srvname, downrate, uprate, limitdl, limitul, limitcomb, limitexpiration,
    		limituptime, poolname, unitprice, unitpriceadd, timebaseexp, timebaseonline, timeunitexp,
    		timeunitonline, trafficunitdl, trafficunitul, trafficunitcomb, inittimeexp, inittimeonline,
    		initdl, initul, inittotal, srvtype, timeaddmodeexp, timeaddmodeonline, trafficaddmode,
    		monthly, enaddcredits, minamount, minamountadd, resetctrdate, resetctrneg, pricecalcdownload,
    		pricecalcupload, pricecalcuptime, unitpricetax, unitpriceaddtax, enableburst, dlburstlimit,
    		ulburstlimit, dlburstthreshold, ulburstthreshold, dlbursttime, ulbursttime, enableservice,
    		dlquota, ulquota, combquota, timequota, priority, nextsrvid, dailynextsrvid, disnextsrvid,
    		availucp, renew, carryover, policymapdl, policymapul, custattr, gentftp, cmcfg, advcmcfg,
    		addamount, ignstatip) = SUCCESS
    JSON array (code, str) = FAILURE

    code              - 0 = SUCCESS, 1 = ERROR
    str  	      - result string
    srvid             - service plan identifier
    srvname           - service plan name
    downrate          - download data rate
    uprate            - upload data rate
    limitdl           - download bytes capping enabled
    limitul           - upload bytes capping enabled
    limitcomb         - total bytes capping enabled
    limitexpiration   - expiry date capping enabled
    limituptime       - online time capping enabled
    poolname          - IP pool name
    unitprice         - unit price
    unitpriceadd      - additional unit price
    timebaseexp       - expiry date base (days, months)
    timebaseonline    - online time base (minutes, hours)
    timeunitexp       - expiry date to add 
    timeunitonline    - online time to add
    trafficunitdl     - download traffic unit
    trafficunitul     - upload traffic unit
    trafficunitcomb   - combined traffic unit
    inittimeexp       - initial expiry value
    inittimeonline    - initial online time value
    initdl            - initial download bytes value
    initul            - initial upload bytes value
    inittotal         - initial total bytes value
    srvtype           - service plan type
    timeaddmodeexp    - date addition mode
    timeaddmodeonline - time addition mode
    trafficaddmode    - traffic addition mode
    monthly           - monthly flag
    enaddcredits      - enable additional credits flag
    minamount         - minimal amount
    minamountadd      - minimal additional amount
    resetctrdate      - reset counters if date is expired flag
    resetctrneg       - reset counters if traffic is negative flag
    pricecalcdownload - postpaid calculation download flag
    pricecalcupload   - postpaid calculation upload flag
    pricecalcuptime   - postpaid calculation online time flag
    unitpricetax      - unit price VAT
    unitpriceaddtax   - additional unit price VAT
    enableburst       - burst mode flag
    dlburstlimit      - download burst limit
    ulburstlimit      - upload burst limit
    dlburstthreshold  - download burst treshold
    ulburstthreshold  - upload burst treshold
    dlbursttime       - download burst time
    ulbursttime       - upload burst time
    enableservice     - service plan enable flag
    dlquota           - download traffic quota
    ulquota           - upload traffic quota
    combquota         - total traffic quota
    timequota         - online time quota
    priority          - queue prioriy
    nextsrvid         - next expired service id
    dailynextsrvid    - next daily service id
    disnextsrvid      - next disabled service id
    availucp          - available in UCP
    renew             - automatic renewal flag
    carryover         - Carry over remaining traffic flag
    policymapdl       - download Cisco policy map name
    policymapul       - upload Cisco policy map name
    custattr          - custom attributes
    gentftp           - generate TFTP bootfile flag
    cmcfg             - generate CM configuration flag
    advcmcfg          - advanced CM configuration string
    addamount         - minimal additional quantity
    ignstatip         - ignore static IP

NOTES
    None

--------------------------------------------------------------------------------

NAME
    get_refillcard - Get refill card details (1.0)

FUNCTION

INPUTS
    apiuser - API user name (mandatory)
    apipass - API user password (mandatory)
    pin     - card identification number (mandatory)

RESULT
    JSON array (code, series, expiration, date, value, owner, used) = SUCCESS
    JSON array (code, str) = FAILURE

    code       - 0 = SUCCESS, 1 = ERROR
    str        - result string
    series     - card serie
    expiration - expiry date
    date       - created on
    value      - refill value
    owner      - assigned to user
    used       - date of activation

NOTES
    None



    <?php

  // call RM API

//  $ch = curl_init("http://161.35.46.125//radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=new_user&username=user1&password=abcd&dlbytes=10&ulbytes=20&totalbytes=30&expiry=2024-11-3&onlinetime=10&enabled=1&acctype=0&srvid=3&simuse=2&usemacauth=0&mac=11:22:33:44:55:66&maccm=44:33:22:11:22:33&groupid=3&custattr=abc&owner=manager1&staticipcm=1.2.3.4&staticipcpe=4.3.2.1&ipmodecm=0&ipmodecpe=0&credits=999&contractid=a233&contractvalid=2025-01-01&firstname=janos&lastname=jonas&company=mycomp&address=oak&city=pittsburg&zip=15432&country=UAS&state=FL&phone=83245313361&mobile=16213476&email=abc@gmail.com&comment=mycomment&taxid=id43&gpslong=123&gpslat=543&lang=English&cnic=cnic1321");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=edit_user&username=user&password=abcd");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=del_user&username=user1");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=get_userdata&username=user");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=send_pod&username=user");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=add_credits&username=user&expiry=1&unit=day");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=get_remaining&username=user");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=send_sms&username=user");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=send_email&recp=info@dmasoftlab.com&subj=test&body=test_msg");
  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=get_srv&srvid=3");
//  $ch = curl_init("http://161.35.46.125/radiusmanager/api/sysapi.php?apiuser=phsweb&apipass=U/5XwyBhMm}3<j2D&q=get_refillcard&pin=11799406");

  curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
  curl_setopt($ch, CURLOPT_BINARYTRANSFER, TRUE);
  $json = curl_exec($ch);

  // decode result string

  $res = json_decode($json, TRUE);
  print_r($res);

  // get result code

  if ($res[0] == 0) // 0 - SUCCESS, 1 - FAILURE
  {
    print "Success!<br>";
//    print $res[1]['expiry'];
  }
  else
    print $res[1];
?>
