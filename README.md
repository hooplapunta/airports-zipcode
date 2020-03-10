# airports-zipcode
Acquiring airports of the world and finding their zip codes

https://github.com/hooplapunta/airports-zipcode
Please find a detailed discussion in writeup.pdf

# Data
You can find the output data in ./output/airportsPostalCode.json.
You can find the original input data in ./output/airports.json.

# Rebuilding
You can rebuild the data with `> node icaoToZipcode.js`, this may take some time, up to half an hour, due to API throttling.