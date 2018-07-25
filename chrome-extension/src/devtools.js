//referance devtools.html for more in depth explanation of how this works.
//this JS should ONLY ever be loaded by devtools.html
chrome.devtools.panels.elements.createSidebarPane("Obverse",
    function(sidebar) {
        // sidebar initialization code here
        sidebar.setPage("index.html");
});