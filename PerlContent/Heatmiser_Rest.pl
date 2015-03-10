package Heatmiser;

# This CGI script provides access to the database of data logged from the
# iPhone interface of Heatmiser's range of Wi-Fi enabled thermostats.
#
# A symbolic link to this file should be created from
# "/usr/lib/cgi-bin/heatmiser/rest"
# (or the appropriate cgi-bin directory on the platform being used).

# Copyright © 2014 Stephen Galbraith
#
# This file is part of the Heatmiser Wi-Fi project.
# <http://code.google.com/p/heatmiser-wifi/>
#
# Heatmiser REST is free software: you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option)
# any later version.
#
# Heatmiser REST is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
# more details.
#
# You should have received a copy of the GNU General Public License
# along with Heatmiser Wi-Fi. If not, see <http://www.gnu.org/licenses/>.


# Catch errors quickly
use strict;
use warnings;

use List::MoreUtils;

# Allow use of modules in the same directory
use Cwd 'abs_path';
use File::Basename;
#use lib (dirname(abs_path $0) =~ /^(.*)$/)[0]; # (clear taintedness)
use lib '/Users/stephengalbraith/Heatmiser/heatmiser-wifi-read-only/bin';

# Useful libraries
use JSON::PP;
use Time::HiRes qw(time sleep);
use heatmiser_config;
use heatmiser_db;
use heatmiser_wifi;

use Dancer2;
set serializer => 'JSON';


# setup the http routes
get '/thermostat' => sub {
    my $alias = heatmiser_config::get_item('alias');
    my @results;
    for my $i (0..@{$alias})
    {
        if (exists ${$alias}[$i])
        {
            my $result = readThermostat( ${$alias}[$i]);
            my $urls;
            $urls->{summary}="/thermostat/${$alias}[$i]/summary";
            $urls->{product}="/thermostat/${$alias}[$i]/product";
            $urls->{comfort}="/thermostat/${$alias}[$i]/comfort";
            $urls->{heating}="/thermostat/${$alias}[$i]/heating";
            $urls->{history}="/thermostat/${$alias}[$i]/history";
            $urls->{heating}="/thermostat/${$alias}[$i]/timer";
            if ($result->{data}->{product}->{model} =~ /^(PRTHW|TM1)$/)
            {
                $urls->{hotwater}="/thermostat/${$alias}[$i]/hotwater";
            }
            push (@results,${urls});
        }
    }
    return \@results;
};

# gets everything we know about this thermostat
get '/thermostat/:id/summary' => sub {
    return readThermostat( param("id"));
};

# gets the product for this thermostat
get '/thermostat/:id/product' => sub {
    my $result = readThermostat( param("id"));
    return ${result}->{data}->{product};
};

# gets the comfort schedule for the thermostat
get '/thermostat/:id/comfort' => sub {
    my $result = readThermostat( param("id"));
    return $result->{data}->{comfort};
};


get '/thermostat/:id/temperature' => sub {
    my $result = readThermostat( param("id"));
    return $result->{data}->{temperature};
};

get '/thermostat/:id/heating' => sub {
    my $result = readThermostat( param("id"));
    return $result->{data}->{heating};
};

put '/thermostat/:id/heating' => sub {
    my $requestData = request->data;
    
    my $stat=param("id");
    my $thermostat = findStatIp($stat);
    error('put request ',$requestData->{data}->{target});
    if (exists $requestData->{data}->{target} && exists $requestData->{data}->{hold})
    {
        error("doing the set");
        my $heatmiser = new heatmiser_wifi(host=>$thermostat,  heatmiser_config::get(qw(pin)));
        my @pre_dcb = $heatmiser->read_dcb();
        my $pre_status = $heatmiser->dcb_to_status(@pre_dcb);
        my @items = $heatmiser->status_to_dcb($pre_status,
                    enabled => 1,
                    runmode => 'heating',
                    holiday => { enabled => 0 },
        heating => { target => $requestData->{data}->{target}});
        error("new items ", @items);
        my @post_dcb = $heatmiser->write_dcb(@items);
        my $post_status = $heatmiser->dcb_to_status(@post_dcb);
        error("after items ", $post_status);
        $heatmiser->close();
        
    }
    my $result = readThermostat( param("id"));
    return $result->{data}->{heating};
};


get '/thermostat/:id/hotwater' => sub {
    my $results = readThermostat( param("id"));
    if ( exists ${results}->{data}->{hotwater})
    {
        return ${results}->{data}->{hotwater};
    }
    return status 404;
};

put '/thermostat/:id/hotwater' => sub {
    my $requestData = request->data;
    my $stat=param("id");
    my $thermostat = findStatIp($stat);
    error('hotwater ',$requestData->{data});
    if (exists $requestData->{data}->{on} )
    {
        my $heatmiser = new heatmiser_wifi(host=>$thermostat,  heatmiser_config::get(qw(pin)));
        my @pre_dcb = $heatmiser->read_dcb();
        my $pre_status = $heatmiser->dcb_to_status(@pre_dcb);
        my @items = $heatmiser->status_to_dcb($pre_status,
        enabled => 1,
        runmode => 'heating',
        holiday => { enabled => 0 },
        hotwater => { on => $requestData->{data}->{on} });
        my @post_dcb = $heatmiser->write_dcb(@items);
        my $post_status = $heatmiser->dcb_to_status(@post_dcb);
        error('after hotwater set',$post_status);
        $heatmiser->close();
    }
    my $result = readThermostat( param("id"));
    return $result->{data}->{hotwater};
};

get '/thermostat/:id/history/temperature/:days' => sub {
    my $stat=param("id");
    my $thermostat = findStatIp($stat);
    my $db = new heatmiser_db(heatmiser_config::get(qw(dbsource dbuser dbpassword)), dateformat => 'javascript');
    my %range = (
        days => scalar param('days'));
    my $temperatures = $db->log_retrieve($thermostat,[qw(time air target comfort)],\%range);
    return fixup_uniq($temperatures);
};

get '/thermostat/:id/history/event/:days' => sub {
    my $stat=param("id");
    my $thermostat = findStatIp($stat);
    my $db = new heatmiser_db(heatmiser_config::get(qw(dbsource dbuser dbpassword)), dateformat => 'javascript');
    my %range = (days => scalar param('days'));
    my $heating = $db->events_retrieve($thermostat, [qw(time state)],'heating', \%range);
    my $hotwater = $db->events_retrieve($thermostat,
    [qw(time state temperature)],
    'hotwater', \%range);
    my $water = fixup($hotwater, sub { ($_[0]+0, $_[1], $_[2]+0) } );
    return {heating=>fixup($heating),water=>$water};
};

get '/thermostat/:id/timer' => sub {
    my $result = readThermostat( param("id"));
    return $result->{data}->{timer};
};


sub readAllThermostats {
    
    my @results;
    
    # loop over all thermostats in the config
    my $stats = heatmiser_config::get_item('host');
    my $alias = heatmiser_config::get_item('alias');
    
    for my $i (0..@{$stats})
    {
        if (exists ${$stats}[$i])
        {
            my $heatmiser=new heatmiser_wifi(host=>${$stats}[$i],  heatmiser_config::get(qw(pin)));
            my @pre_dcb = $heatmiser->read_dcb();
            my $pre_status = $heatmiser->dcb_to_status(@pre_dcb);
            $heatmiser->close();
            push (@results,{key=>${$alias}[$i],stat_addr=>${$stats}[$i],data=>$pre_status,});
        }
    }
    return (\@results);
};

sub readThermostat {
    my $stat = $_[0];
    # loop over all thermostats in the config
    my $thermostat = findStatIp($stat);
    if (defined($thermostat))
    {
            my $heatmiser=new heatmiser_wifi(host=>$thermostat,  heatmiser_config::get(qw(pin)));
            my @pre_dcb = $heatmiser->read_dcb();
            my $pre_status = $heatmiser->dcb_to_status(@pre_dcb);
            $heatmiser->close();
            return {key=>$stat,stat_addr=>$thermostat,data=>$pre_status,};
    
    }
    return status 404;

};

# find which stat we are referencing from the alias name
sub findStatIp {
    my $stat = $_[0];
    my $stats = heatmiser_config::get_item('host');
    my $alias = heatmiser_config::get_item('alias');
    for my $i (0..@{$stats})
    {
        if (${$alias}[$i] eq $stat && exists ${$stats}[$i])
        {
            return  ${$stats}[$i];
        }
    }
};

# Filter out rows that only differ by date and convert text to numbers for JSON
sub fixup_uniq
{
    my ($in) = @_;
    
    # Process every row
    my ($out, $values, $prev_values) = ([], '', '');
    foreach my $row (@$in)
    {
        # Skip over duplicates (ignoring the time field), except last entry
        ($prev_values, $values) = ($values, join(',', @$row[1 .. $#$row]));
        next if $values eq $prev_values and $row->[0] != $in->[-1]->[0];
        
        # Convert all values to numbers
        push @$out, [map { $_ + 0 } @$row];
    }
    
    # Return the result
    return $out;
}

# Convert text to numbers for JSON
sub fixup
{
    my ($in, $sub) = @_;
    
    # Default is to fix every column
    $sub = sub { map { $_ + 0 } @_ } unless defined $sub;
    
    # Process every row and return the result
    return [map {[ $sub->(@$_) ]} @$in];
}
    
dance;



