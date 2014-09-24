var _ = require('lodash');
var hb = require('handlebars');
var fs = require('fs');

module.exports = function(bosco) { 
    
    var createKey = require('./AssetHelper')(bosco).createKey;

    return {
        createAssetHtmlFiles:createAssetHtmlFiles,
        attachFormattedRepos: attachFormattedRepos
    }

    function createAssetHtmlFiles(staticAssets, next) {

        var htmlAssets = {};

        var cdnPort = bosco.config.get('cdn:port') || "7334";
        var cdnHostname = bosco.config.get('cdn:hostname') || 'localhost';
        var cdnUrl = bosco.config.get('aws:cdn') ? bosco.config.get('aws:cdn') : 'http://'+ cdnHostname +':' + cdnPort;

        _.forOwn(staticAssets, function(asset, key) {
            var html;
            var htmlFile = createKey(asset.tag, asset.type, 'html', 'html');

            if (!isJavascript(asset) && !isStylesheet(asset)) return;

            htmlAssets[htmlFile] = htmlAssets[htmlFile] || {
                content: "<!-- Generated by Bosco -->\n",
                type: "html",
                assetType: asset.type,
                tag: asset.tag,
                extname: ".html"
            };

            if (isJavascript(asset)) {
                htmlAssets[htmlFile].content += _.template('<script src="<%= url %>"></script>\n', {
                    'url': cdnUrl + "/" + key
                });
            }

            if (isStylesheet(asset)) {
                htmlAssets[htmlFile].content += _.template('<link rel="stylesheet" href="<%=url %>" type="text/css" media="screen" />\n', {
                    'url': cdnUrl + "/" + key
                });
            }
        });

        staticAssets = _.merge(htmlAssets, staticAssets);

        staticAssets.formattedAssets = formattedAssets(staticAssets);

        next(null, staticAssets);

    }

    function isJavascript(asset) {
        if (asset.type !== 'js') return false;
        if (asset.extname !== '.js') return false;

        return true;
    }

    function isStylesheet(asset) {
        return asset.type === 'css';
    }

    function attachFormattedRepos(repos, next) {
        repos.formattedRepos = formattedRepos(repos);

        next(null, repos);
    }


    function formattedAssets(staticAssets) {

        var assets = {};
        var templateContent = fs.readFileSync(__dirname + '/../templates/assetList.html');
        var template = hb.compile(templateContent.toString());

        _.map(staticAssets, function(asset, key) {
            if (!Array.isArray(assets[asset.type])) {
                assets[asset.type] = [];
            }

            assets[asset.type].push(key);
        });

        assets.user = bosco.config.get('github:user');
        assets.date = (new Date()).toString();

        return template(assets);

    }

    function formattedRepos(repos) {

        var templateContent = fs.readFileSync(__dirname + '/../templates/repoList.html'),
            template = hb.compile(templateContent.toString()),
            templateData = { repos: repos };

        templateData.user = bosco.config.get('github:user');
        templateData.date = (new Date()).toString();

        return template(templateData);

    }
}
