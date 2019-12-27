function is_defined(d) {
    return typeof d !== "undefined";
}

function is_folder(bookmark) {
    return !is_defined(bookmark.url);
}

function move_bookmark_to_folder(bookmark, folder_name) {
    return browser.bookmarks.search(folder_name).then(function (results) {

        /* Filter non-folders */
        results = results.filter((x) => is_folder(x));

        /* Match only exact results */
        results = results.filter((x) => x.title == folder_name);

        /* TODO: Filter trashed folders */
        /*
        results = results.filter((x) => {
            false
        });*/

        if (results.length == 0) {
            return browser.bookmarks.create({ title: folder_name, parentId: "1" }).then(function (target_folder) {
                return browser.bookmarks.move(bookmark.id, { parentId: target_folder.id });
            });
        } else {
            if (bookmark.parentId != results[0].id) {
                return browser.bookmarks.move(bookmark.id, { parentId: results[0].id });
            }
        }
    });
}

function organize_bookmark(bookmark) {
    for (const [rule_url, rule_target] of Object.entries(rules)) {
        let url_matches = bookmark.url.match(new RegExp(rule_url));

        if (url_matches) {
            return move_bookmark_to_folder(bookmark, rule_target);
        }
    }
    //move_bookmark_to_folder(bookmark, "Other");
}

browser.runtime.onInstalled.addListener(function () {
    /* Reorganize on startup */
    browser.bookmarks.getSubTree("1").then(async function (results) {
        let all_bookmarks = [];

        function visit_nodes(node) {
            for (child of node.children) {
                if (is_folder(child)) {
                    visit_nodes(child);
                } else {
                    all_bookmarks.push(child.id);
                }
            }
        }

        visit_nodes(results[0]);

        for (bookmark_id of all_bookmarks) {
            await browser.bookmarks.get(bookmark_id).then(function (results) {
                return organize_bookmark(results[0]);
            });
        }
    });

    /* Reorganize on addition */
    browser.bookmarks.onCreated.addListener(
        function (id, bookmark) {
            if (is_folder(bookmark)) {
                return;
            }

            organize_bookmark(bookmark);
        }
    );
});