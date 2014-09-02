var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var green = '\u001b[42m \u001b[0m';
var red = '\u001b[41m \u001b[0m';

module.exports = {
	name:'install',
	description:'Runs npm install against all repos',
	example:'bosco install -r <repoPattern>',
	cmd:cmd
}

function cmd(bosco, args, next) {

	var repoPattern = bosco.options.repo;
	var repoRegex = new RegExp(repoPattern);
	
	var repos = bosco.config.get('github:repos');
	if(!repos) return bosco.error("You are repo-less :( You need to initialise bosco first, try 'bosco fly'.");

	bosco.log("Running npm install across all repos ...");

	var installRepos = function(cb) {
	    	
		var progressbar = bosco.config.get('progress') == 'bar', 
			total = repos.length;

		var bar = progressbar ? new bosco.progress('Doing npm install [:bar] :percent :etas', {
  			complete: green,
  			incomplete: red,
			width: 50,
			total: total
		}) : null;

		async.mapLimit(repos, bosco.options.cpus, function repoStash(repo, repoCb) {	  

		  if(!repo.match(repoRegex)) return repoCb();

		  var repoPath = bosco.getRepoPath(repo); 
		  install(bosco, progressbar, bar, repoPath, repoCb);
		  
		}, function(err) {
			cb();
		});

	}

	installRepos(function() {
		bosco.log("Complete");
		if(next) next();
	});

}

function install(bosco, progressbar, bar, repoPath, next) {

	var packageJson = [repoPath,"package.json"].join("/");
	if(!bosco.exists(packageJson)) {
		if(progressbar) bar.tick();
		return next();	
	}

	exec('npm install', {
	  cwd: repoPath
	}, function(err, stdout, stderr) {
		if(progressbar) bar.tick();
		if(err) {
			if(progressbar) console.log("");
			bosco.error(repoPath.blue + " >> " + stderr);
		} else {
			if(!progressbar) {
				if(!stdout) {
					bosco.log("NPM install for " + repoPath.blue + ": " + "No changes".green);
				} else {
					bosco.log("NPM install for " + repoPath.blue);
					console.log(stdout);
				}							
			} 
		}
		next();
	});

}
