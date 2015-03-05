var _ = require('lodash');
var hb = require('handlebars');
var fs = require('fs');

module.exports = function(bosco) {

    var createKey = require('./AssetHelper')(bosco).createKey;

    function createAssetHtmlFiles(staticAssets, next) {

        var htmlAssets = {};

        _.forOwn(staticAssets, function(asset, key) {

            var htmlFile = createKey(asset.serviceName, asset.buildNumber, asset.tag, asset.type, 'html', 'html');

            if (!isJavascript(asset) && !isStylesheet(asset)) return;

            htmlAssets[htmlFile] = htmlAssets[htmlFile] || {
                content: '',
                type: 'html',
                assetType: asset.type,
                tag: asset.tag,
                isMinifiedFragment: true,
                extname: '.html'
            };

            if (isJavascript(asset)) {
                htmlAssets[htmlFile].content += _.template('<script src="<%= url %>"></script>\n', {
                    'url': bosco.getAssetCdnUrl(key)
                });
            }

            if (isStylesheet(asset)) {
                htmlAssets[htmlFile].content += _.template('<link rel="stylesheet" href="<%=url %>" type="text/css" media="screen" />\n', {
                    'url': bosco.getAssetCdnUrl(key)
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

            var assetType = asset.isMinifiedFragment ? 'fragment-' + asset.type : asset.type;

            if (!Array.isArray(assets[assetType])) {
                assets[assetType] = [];
            }
            assets[assetType].push({
                asset: key,
                tag: asset.tag,
                repo: asset.repo || 'Minified',
                path: asset.relativePath || 'Minified',
                url: bosco.getAssetCdnUrl(key)
            });
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

    return {
        createAssetHtmlFiles:createAssetHtmlFiles,
        attachFormattedRepos: attachFormattedRepos
    }

}
