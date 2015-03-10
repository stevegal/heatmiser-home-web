var buttonBeep = new Audio("sounds/204.wav");
buttonBeep.currentTime = 0;

var app = angular.module("home", [ "ui.router" ]);

app.directive('chart', [ '$window', function($window) {

	return {
		restrict : 'E',
		replace : true,
		scope : {
			data : '=data',
		    options: '=option'
		},

		template : '<div class="chart"></div>',
		link : function(scope, element, attrs) {

			scope.chart = new google.visualization.ComboChart(element[0]);
			
			var options = {
				
				hAxis : {
					format : "MMM dd HH:mm",
					gridlines : {
						color : 'teal'
					},
					baselineColor : 'teal'
				},
				vAxes : {
					0 :{textPosition:'out', baselineColor : 'teal',
						gridlines : {
							color : 'teal'
						}},
				    1 :{ textPosition:'none', gridlines:{color:'teal',count:2}}
				},
				backgroundColor : 'black',
				legend : {
					textStyle : {
						color : 'teal'
					},
					position : 'in'
				},
				seriesType : "line",
				animation : {
					duartion : 5000,
					startup : true
				},
				series : {
					3 : {
						type : 'area',
						targetAxisIndex : 1,
						lineWidth : 0,
						color : 'orange',
						visibleInLegend : false
					}
				}
			};

			scope.$watch('data', function(v) {
				scope.data = v;
				scope.chart.draw(scope.data, options);

			}, true);

			angular.element($window).bind('resize', function() {
				console.log("redrawing");
				scope.chart = new google.visualization.ComboChart(element[0]);
				scope.chart.draw(scope.data, options);
			});

		}
	};

} ]);

app.directive('gant',['$window','$rootScope',function($window,$rootScope){
	return {
		restrict : 'E',
		replace : true,
		scope : {
			data : '=data',
			options : '=options'
		},
		
		template : '<div class="chart"></div>',
		link : function(scope, element, attrs) {
			console.log("setting up"+JSON.stringify(scope.data));
			console.log('timeline on element '+ google.visualization.Timeline);
			scope.chart = new google.visualization.Timeline(element[0]);
			console.log('watching '+JSON.stringify(scope.data));
			$rootScope.$on('redraw', function(event,v) {
				scope.data=v;
				if (scope.data.getNumberOfRows()>0)
				{
					console.log("number rows >0 redrawing");
				    scope.chart.draw(scope.data,scope.options);
				}
				else
					{
					console.log("number rows <=0 not redrawing");
					}

			});
			scope.$watch('data', function(v) {
				scope.data = v;
				if (scope.data.getNumberOfRows()>0)
				{
					console.log("number rows >0 redrawing");
				    scope.chart.draw(scope.data,scope.options);
				}
				else
					{
					console.log("number rows <=0 not redrawing");
					}

			}, true);
			angular.element($window).bind('resize', function() {
				
				console.log("redrawing"+JSON.stringify(scope.data));
				scope.chart = new google.visualization.Timeline(element[0]);
				scope.chart.setColumns([0,2,3,4])
				scope.chart.draw(scope.data,scope.options);
			});
		}
	};
}]);

app.service('HeatmiserService', function($http) {

	var request = {
		getCurrent : function() {
			var promise = $http.get("/heatmiser/thermostat", {
				headers : {
					'Accept' : 'application/json'
				}
			}).then(function(response) {
				return response.data;
			});
			return promise;
		},
		getCurrentFor : function(stat) {
			var promise = $http.get(
					"/heatmiser/thermostat/" + stat + "/summary", {
						headers : {
							'Accept' : 'application/json'
						}
					}).then(function(response) {
				return response.data;
			});
			return promise;
		},
		getHistoryFor : function(stat, days) {
			var promise = $http.get(
					"/heatmiser/thermostat/" + stat + "/history/temperature/"
							+ days, {
						headers : {
							'Accept' : 'application/json'
						}
					}).then(function(response) {
				return response.data;
			});
			return promise;
		},
		getEventHistoryFor : function(stat, days) {
			var promise = $http.get(
					"/heatmiser/thermostat/" + stat + "/history/event/" + days,
					{
						headers : {
							'Accept' : 'application/json'
						}
					}).then(function(response) {
				console.log(JSON.stringify(response.data));
				return response.data;
			});
			return promise;
		},
		setTargetFor : function(stat, newTemp) {
			console.log("new temp " + newTemp);
			var promise = $http.put(
					"/heatmiser/thermostat/" + stat + "/heating", {
						headers : {
							'Content-type' : 'application/json'
						},
						data : {
							target : newTemp,
							hold : 0
						}
					}).then(function(data) {
				console.log(JSON.stringify(data));
				return data;
			});
			return promise;
		},
		setHotWater : function(stat, newState, holdTime) {
			var promise = $http.put(
					"/heatmiser/thermostat/" + stat + "/hotwater", {
						headers : {
							'Content-type' : 'application/json'
						},
						data : {
							on : newState
						}
					}).then(function(data) {
				return data;
			});
			return promise;
		},
		getComfortSchedule : function (stat) {
			var promise = $http.get("/heatmiser/thermostat/"+stat+"/comfort", {
				headers :{ 'Accept' : 'application/json'}
			}).then(function (data) {
				console.log('comfort data '+JSON.stringify(data));
				return data.data;
			});
			return promise;

		},
		getHotWaterSchedule : function (stat) {
			var promise = $http.get("/heatmiser/thermostat/"+stat+"/timer", {
				headers :{ 'Accept' : 'application/json'}
			}).then(function (data) {
				console.log('timer data '+JSON.stringify(data.data));
				return data.data;
			});
			return promise;

		}
	};
	return request;

});
app.run(function($rootScope) {
	$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams,
			fromState, fromParams) {
		console.log("state change success" + JSON.stringify(toState));

		$rootScope.stateName = toState.name;
		$rootScope.displayName = toState.data.displayName;
	});
});
app.config([ '$stateProvider', '$urlRouterProvider',
		function($stateProvider, $urlRouterProvider) {
			$urlRouterProvider.otherwise("/heating");

			$stateProvider.state('heating', {
				url : '/heating',
				views : {
					"cntrlMenu" : {
						templateUrl : 'templates/heatingMainMenu.htm'
					},
					"subMenu" : {
						templateUrl : 'templates/heatingSecondaryMenu.htm'
					},
					"mainDisplay" : {
						templateUrl : 'templates/heating.htm',
						controller : "heatingCtrl"
					}
				},
				data : {displayName:'current'}

			}).state('heating_schedule', {
				url : '/schedule',
				
				views : {
					"cntrlMenu" : {
						templateUrl : 'templates/heatingMainMenu.htm'
					},
					"subMenu" : {
						templateUrl : 'templates/scheduleSecondaryMenu.htm',
						controller: "heatingScheduleChanger",
					},
					"mainDisplay" : {
						templateUrl : 'templates/schedule.htm',
						controller : "heatingSchedule",
						
					}
				},
				data : {displayName:'schedule'}
			}).state('heating_history', {
				url : '/history',
				views : {
					"cntrlMenu" : {
						templateUrl : 'templates/heatingMainMenu.htm'
					},
					"subMenu" : {
						templateUrl : 'templates/heatingSecondaryMenu.htm'
					},
					"mainDisplay" : {
						templateUrl : 'templates/history.htm',
						controller : "heatingHistory"
					}
				},
				data : {displayName:'history'}
			}).state('media', {
				url : '/media',
				controller : "mediaCtrl",
				views : {
					"cntrlMenu" : {
						templateUrl : 'templates/mediaMainMenu.htm'
					},
					"subMenu" : {
						templateUrl : 'templates/mediaSecondaryMenu.htm'
					},
					"mainDisplay" : {
						templateUrl : 'templates/media.htm'
					}
				},
				data : {displayName:'media'}
			}).state('gates', {
				url : '/gates',
				controller : "gatesCtrl",
				views : {
					"mainDisplay" : {
						templateUrl : 'templates/gates.htm'
					}
				},
				data : {displayName:'gates'}
			}).state('lights', {
				url : '/lights',
				controller : "lightsCtrl",
				views : {
					"mainDisplay" : {
						templateUrl : 'templates/lights.htm'
					}
				},
				data : {displayName:'lights'}
			});
		} ]);

app
		.controller(
				'heatingCtrl',
				[
						'$rootScope',
						'$scope',
						'$interval',
						'HeatmiserService',
						function($rootScope, $scope, $interval,
								HeatmiserService) {
							console.log("heating");
							HeatmiserService
									.getCurrentFor("Main")
									.then(
											function(response) {
												console.log("main "
														+ response.internal);
												$scope.main = response.data;

												console
														.log('hotwater '
																+ JSON
																		.stringify($scope.main.hotwater));
											});
							HeatmiserService.getCurrentFor("Extension")
									.then(
											function(response) {
												console.log("ext "
														+ response.internal);
												$scope.ext = response.data;
											});
							var promise;

							$scope.monitor = function() {
								if (!angular.isDefined(promise)) {
									console.log("creating promise");
									promise = $interval(
											function() {
												HeatmiserService
														.getCurrentFor("Main")
														.then(
																function(
																		response) {
																	console
																			.log("main "
																					+ response.data.data.temperature.internal);
																	$scope.main = response.data;
																	console
																			.log('hotwater '
																					+ JSON
																							.stringify($scope.main.hotwater));
																});
												HeatmiserService
														.getCurrentFor(
																"Extension")
														.then(
																function(
																		response) {
																	console
																			.log("ext "
																					+ response.data.data.temperature.internal);
																	$scope.ext = response.data;
																});
											}, 30000);
								}
								console.log("done monitor");
							};
							$scope.stopMonitor = function() {
								if (angular.isDefined(promise)) {
									$interval.cancel(promise);
								}
							};
							$rootScope.$on('$stateChangeSuccess',
									function(event, toState, toParams,
											fromState, fromParams) {
										console.log("state change success");
										if (toState.name == 'heating') {
											console.log("monitor "
													+ toState.name);
											$scope.monitor();
										} else {
											console.log("stop Monitor "
													+ toState.name);
											$scope.stopMonitor();
										}
										;
									});
							$scope.incMainComfortTemp = function() {
								buttonBeep.play();
								buttonBeep.currentTime = 0;
								console.log("increasing temp");
								HeatmiserService
										.setTargetFor('Main',
												$scope.main.heating.target + 1)
										.then(
												function(response) {

													$scope.main.heating = response.data;
												});
							};
							$scope.decMainComfortTemp = function() {
								console.log("decreasing temp");
								buttonBeep.play();
								buttonBeep.currentTime = 0;
								HeatmiserService
										.setTargetFor('Main',
												$scope.main.heating.target - 1)
										.then(
												function(response) {

													$scope.main.heating = response.data;
												});
							};
							$scope.incExtComfortTemp = function() {
								console.log("increasing temp");
								buttonBeep.play();
								buttonBeep.currentTime = 0;
								HeatmiserService.setTargetFor('Extension',
										$scope.ext.heating.target + 1).then(
										function(response) {

											$scope.ext.heating = response.data;
										});
							};
							$scope.decExtComfortTemp = function() {
								console.log("decreasing temp");
								buttonBeep.play();
								buttonBeep.currentTime = 0;
								HeatmiserService.setTargetFor('Extension',
										$scope.ext.heating.target - 1).then(
										function(response) {

											$scope.ext.heating = response.data;
										});
							};
							$scope.hotWaterOn = function() {
								console.log("hot water on for 60 mins");
								buttonBeep.play();
								buttonBeep.currentTime = 0;
								HeatmiserService
										.setHotWater("Main", 1, 0)
										.then(
												function(response) {
													$scope.main.hotwater = response.data;
												});
							};
							$scope.hotWaterOff = function() {
								console.log("hot water off");
								buttonBeep.play();
								buttonBeep.currentTime = 0;
								HeatmiserService
										.setHotWater("Main", 0, 0)
										.then(
												function(response) {
													$scope.main.hotwater = response.data;
												});
							};
							$scope.monitor();
						} ]);
app.controller("heatingHistory", [
		'$q',
		'$rootScope',
		'$scope',
		'$interval',
		'HeatmiserService',
		function($q, $rootScope, $scope, $interval, HeatmiserService) {
			$scope.populateChart = function(dataTable, response) {
				console.log("updating chart");
				var data = response[0];
				var events = response[1].heating;
				var eventIndex = 0;
				var heatingInitial = events[0][1] == 1 ? 0 : 1;
				for (var i = 0; i < data.length; i++) {
					var date = new Date(data[i][0])
					var eventDate = new Date(events[eventIndex][0]);
					var currentHeating = events[eventIndex][1];
					if (date >= eventDate) {
						eventIndex++;
						heatingInitial = currentHeating;
					}
					dataTable.addRow([ date, data[i][1], data[i][2],
							data[i][3], heatingInitial ]);

				}
				console.log("number of rows after update:"
						+ dataTable.getNumberOfRows());
			};
			$scope.getData = function(stat, days) {
				console.log("updating " + stat.selected + " no of rows "
						+ stat.history.getNumberOfRows());
				stat.history.removeRows(0, stat.history.getNumberOfRows());
				var history = HeatmiserService.getHistoryFor(
						stat.selected.name, days);
				var events = HeatmiserService.getEventHistoryFor(
						stat.selected.name, days);
				$q.all([ history, events ]).then(function(response) {
					$scope.populateChart(stat.history, response);
				});
			};
			$scope.thermostatOptions = [ {
				name : "Main"
			}, {
				name : "Extension"
			} ];
			$scope.daysOption = [ {
				display : "1 day",
				value : 1
			}, {
				display : "2 days",
				value : 2
			}, {
				display : "3 days",
				value : 3
			}, {
				display : "4 days",
				value : 4
			}, {
				display : "5 days",
				value : 5
			}, {
				display : "6 days",
				value : 6
			}, {
				display : "1 week",
				value : 7
			}, {
				display : "2 weeks",
				value : 14
			} ];
			$scope.days = $scope.daysOption[0];
			$scope.$watch('days', function(newValue, oldValue) {
				console.log("updating chart days changed " + newValue.value
						+ " " + oldValue.value);
				if (newValue != oldValue) {
					$scope.getData($scope.main, $scope.days.value);
					$scope.getData($scope.ext, $scope.days.value);
				}

			});
			$scope.main = {};
			$scope.main.selected = $scope.thermostatOptions[0];
			$scope.$watch('main.selected', function(newValue, oldValue) {
				console.log("updating main.selected changed " + newValue.name
						+ " " + oldValue.name);
				if (newValue != oldValue) {
					$scope.getData($scope.main, $scope.days.value);
				}
			});

			$scope.main.history = new google.visualization.DataTable();
			$scope.main.history.addColumn('datetime', 'time');
			$scope.main.history.addColumn('number', 'air');
			$scope.main.history.addColumn('number', 'target');
			$scope.main.history.addColumn('number', 'comfort');
			$scope.main.history.addColumn('number', 'heating');
			// $scope.mainHistory.addColumn({type:'string',
			// role:'annotation'},'hotwater');
			$scope.ext = {};
			$scope.ext.selected = $scope.thermostatOptions[1];
			$scope.$watch('ext.selected', function(newValue, oldValue) {
				console.log("updating ext.selected changed" + newValue.name
						+ " " + oldValue.name);
				if (newValue != oldValue) {
					$scope.getData($scope.ext, $scope.days.value);
				}
			});
			$scope.ext.history = new google.visualization.DataTable();
			$scope.ext.history.addColumn('datetime', 'time');
			$scope.ext.history.addColumn('number', 'air');
			$scope.ext.history.addColumn('number', 'target');
			$scope.ext.history.addColumn('number', 'comfort');
			$scope.ext.history.addColumn('number', 'heating');
			
			// intialise the charts
			$scope.getData($scope.main, $scope.days.value);
			$scope.getData($scope.ext, $scope.days.value);

		} ]);
app.controller('heatingScheduleChanger',['$rootScope','$scope',function($rootScope,$scope){
	$scope.setThermostat = function(thermostat) {
		$rootScope.$emit('scheduleChange',thermostat);
	}
}]);
app.controller('heatingSchedule',[
    '$q',                  
	'$rootScope',
	'$scope',
	'HeatmiserService',function($q,$rootScope,$scope,HeatmiserService){
		$scope.getData = function(stat) {
			var comfort = HeatmiserService.getComfortSchedule(
					stat.name);
			var hotWater = HeatmiserService.getHotWaterSchedule(
					stat.name);
			$q.all([ comfort, hotWater ]).then(function(response) {
				$scope.populateChart(stat.schedule, response);
			});
		};
		console.log('heating schedule controller');
		$scope.redraw=true;
		$scope.main = {name:'Main'};
		$scope.main.schedule = new google.visualization.DataTable();
		$scope.main.schedule.addColumn({type:'string',id:'Day'});
		$scope.main.schedule.addColumn({type:'string',id:'Temp'});
		$scope.main.schedule.addColumn({type:'date',id:'Start'});
		$scope.main.schedule.addColumn({type:'date',id:'end'});
		console.log('heating schedule controller '+JSON.stringify($scope.main));
		
		$rootScope.$on('scheduleChange',function(event,thermostat)
		{
			
			$scope.main.name=thermostat;
			console.log('set thermostat to '+$scope.main.name+ " "+$scope.main.schedule.getNumberOfRows());
			$scope.main.schedule.removeRows(0,$scope.main.schedule.getNumberOfRows());
			console.log('cleared '+$scope.main.name+ " "+$scope.main.schedule.getNumberOfRows());
			$scope.getData($scope.main);
		});
		$scope.populateChart = function(dataTable,responseData) {
			var comfort = responseData[0];
			var hotWater = responseData[1];
			
			console.log(" comfort length: "+comfort.length);
			var days =['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
			for (var i = 0; i < 7; i++) {
				var dataIndex = i;
				// switches for 5/2 weekend-weekday modes
				if (comfort.length ==2 && i<5 ) {dataIndex=0};
				if (comfort.length ==2 && i>=5 ) {dataIndex=1};
				if (comfort.length ==6 && i>5) {dataIndex = 5};
				for (var j=0;j<comfort[dataIndex].length;j++)
				{
					
					var endString = comfort[dataIndex][j+1]===undefined?"24:00:00":comfort[dataIndex][j+1].time;
					//console.log(days[i]+' '+comfort[dataIndex][j].target+' '+comfort[dataIndex][j].time+' '+endString);
					var timeBits = comfort[dataIndex][j].time.split(':');
					var endTime = endString.split(':');
					dataTable.addRow([days[i],comfort[dataIndex][j].target+'',
					                  new Date(0,0,0,parseInt(timeBits[0]),parseInt(timeBits[1]),parseInt(timeBits[2]),0),
					                  new Date(0,0,0,parseInt(endTime[0]),parseInt(endTime[1]),parseInt(endTime[2]),0)]);
					
				}
				
				
			}
			
			console.log(" hotWater length: "+hotWater.length);
			
			{
				for (var i = 0; i < 7; i++) {
					var dataIndex = i;
					// switches for 5/2 weekend-weekday modes
					if (hotWater.length ==2 && i<5 ) {dataIndex=0};
					if (hotWater.length ==2 && i>=5 ) {dataIndex=1};
					if (hotWater.length ==6 && i>5) {dataIndex = 5};
					for (var j=0;j<hotWater[dataIndex].length;j++)
					{
						console.log('hotWater '+JSON.stringify(hotWater[dataIndex][j]));
						if (hotWater[dataIndex][j].on && hotWater[dataIndex][j].off)
						{
						var endString = hotWater[dataIndex][j].off;
						console.log(days[i]+' hotwater  '+hotWater[dataIndex][j].on+' '+endString);
						var timeBits = hotWater[dataIndex][j].on.split(':');
						var endTime = endString.split(':');
						dataTable.addRow([days[i],'water - on',
						                  new Date(0,0,0,parseInt(timeBits[0]),parseInt(timeBits[1]),parseInt(timeBits[2]),0),
						                  new Date(0,0,0,parseInt(endTime[0]),parseInt(endTime[1]),parseInt(endTime[2]),0)]);
						}
					}
					
					
				}
			}
			//$rootScope.$emit('redraw',dataTable);
			console.log("new data "+JSON.stringify(dataTable));
		};
		$scope.getData($scope.main);
	}
	]
);

// you have to bootstrap angular after the google graph api for some odd reason.
google.setOnLoadCallback(function() {

	angular.bootstrap(document, [ 'home' ]);

});
google.load('visualization', '1', {
	packages : [ 'corechart', 'timeline']
});
