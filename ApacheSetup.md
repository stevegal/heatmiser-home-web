# Introduction #
When you deploy this code you will need to restrict access so that your thermostats are not open to the whoel of the web. You won't want just anyone turning on your hot water and changing your room temperatures. This guide will give you details of how to set up apache to ensure your traffic is encrypted (with https) and password protected.

This setup runs apache to serve static content (i.e the pages and javascript) but delegates the perl that controls the thermostat to a separate perl server (Starman http://search.cpan.org/~miyagawa/Starman-0.1000/lib/Starman.pm in this case)


## Https setup ##


## Password protection ##

## Setup Reverse proxy ##