var PagedTable = function (pagedTable) {
  var source = function(pagedTable) {
    var sourceElems = [].slice.call(pagedTable.children).filter(function(e) {
      return e.hasAttribute("data-pagedtable-source");
    });

    if (sourceElems === null || sourceElems.length !== 1) {
      throw("A single data-pagedtable-source was not found");
    }

    return JSON.parse(sourceElems[0].innerHTML);
  }(pagedTable);

  var Page = function(data) {
    var me = this;

    me.max = 10;
    me.size = 10;
    me.count = 0;
    me.number = 0;

    var getPageCount = function() {
      return Math.ceil(data.length / me.size);
    };

    me.setSize = function(newSize) {
      me.size = Math.min(me.max, newSize);
    };

    me.setPageNumber = function(newPageNumber) {
      if (newPageNumber < 0) return;
      if (newPageNumber * me.size >= data.length) return;

      me.number = newPageNumber;
    };

    me.getVisiblePageRange = function() {
      var start = me.number - Math.max(Math.floor((me.size / 2 - 1)), 0);
      var end = me.number + (me.size / 2);

      if (start < 0) {
        var diffToStart = 0 - start;
        start += diffToStart;
        end += diffToStart;
      }

      if (end > me.count) {
        var diffToEnd = end - me.count;
        start -= diffToEnd;
        end -= diffToEnd;
      }

      start = start < 0 ? 0 : start;
      end = end >= me.count ? me.count : end;

      return {
        start: start,
        end: end
      };
    };

    me.count = getPageCount();
  };

  var Columns = function(source) {
    var me = this;

    me.number = 0;
    me.visible = 10;
    me.total = source.columns.length;
    me.subset = [];

    var updateSlice = function() {
      if (me.number + me.visible >= me.total)
        me.number = me.total - me.visible;

      if (me.number < 0) me.number = 0;

      me.subset = source.columns.slice(me.number, Math.min(me.number + me.visible, me.total));
    };

    me.setVisibleColumns = function(newVisibleColumns) {
      me.visible = newVisibleColumns;
      updateSlice();
    };

    me.incColumnNumber = function(increment) {
      me.number = me.number + increment;
      updateSlice();
    };

    me.getPaddingCount = function() {
      return Math.max((me.visible / 2) - me.subset.length, 0);
    };

    me.incColumnNumber(0);
    return me;
  };

  var data = source.data;
  var page = new Page(data);
  var columns = new Columns(source);

  var renderColumnNavigation = function(increment, leftArrow) {
    var arrow = document.createElement("div");
    arrow.setAttribute("style",
      "border-top: 5px solid transparent;" +
      "border-bottom: 5px solid transparent;" +
      "border-" + (leftArrow ? "right" : "left") + ": 5px solid;");

    var header = document.createElement("th");
    header.appendChild(arrow);
    header.setAttribute("style",
      "cursor: pointer;" +
      "vertical-align: middle;");

    header.onclick = function() {
      columns.incColumnNumber(increment);
      renderHeader();
      renderBody();
      renderFooter();
    };

    return header;
  };

  var renderHeader = function() {
    var thead = pagedTable.querySelectorAll("thead")[0];
    thead.innerHTML = "";

    var header = document.createElement("tr");
    thead.appendChild(header);

    if (columns.number > 0)
      header.appendChild(renderColumnNavigation(-columns.visible, true));

    columns.subset.forEach(function(columnData) {
      var column = document.createElement("th");
      column.setAttribute("align", columnData.align);

      var columnName = document.createElement("div");
      columnName.appendChild(document.createTextNode(columnData.name));
      column.appendChild(columnName);

      if (columnData.type !== null) {
        var columnType = document.createElement("div");
        columnType.setAttribute("class", "pagedtable-header-type");
        columnType.appendChild(document.createTextNode("<" + columnData.type + ">"));
        column.appendChild(columnType);
      }

      header.appendChild(column);
    });

    for (var idx = 0; idx < columns.getPaddingCount(); idx++) {
      var paddingCol = document.createElement("th");
      paddingCol.setAttribute("class", "pagedtable-padding-col");
      header.appendChild(paddingCol);
    }

    if (columns.number + columns.visible < columns.total)
      header.appendChild(renderColumnNavigation(columns.visible, false));

    return thead;
  };

  var renderBody = function() {
    var tbody = pagedTable.querySelectorAll("tbody")[0];
    tbody.innerHTML = "";

    var pageData = data.slice(page.number * page.size, (page.number + 1) * page.size);

    pageData.forEach(function(dataRow, idxRow) {
      var htmlRow = document.createElement("tr");
      htmlRow.setAttribute("class", (idxRow % 2 !==0) ? "even" : "odd");

      if (columns.number > 0)
        htmlRow.appendChild(document.createElement("td"));

      columns.subset.forEach(function(columnData) {
        var cellName = columnData.name;
        var dataCell = dataRow[cellName];
        var htmlCell = document.createElement("td");
        htmlCell.appendChild(document.createTextNode(dataCell));
        htmlCell.setAttribute("align", columnData.align);
        htmlRow.appendChild(htmlCell);
      });

      for (var idx = 0; idx < columns.getPaddingCount(); idx++) {
        var paddingCol = document.createElement("td");
        paddingCol.setAttribute("class", "pagedtable-padding-col");
        htmlRow.appendChild(paddingCol);
      }

      if (columns.number + columns.visible < columns.total)
        htmlRow.appendChild(document.createElement("td"));

      tbody.appendChild(htmlRow);
    });

    return tbody;
  };

  var getLabelInfo = function(long) {
    var pageStart = page.number * page.size;
    var pageEnd = Math.min((page.number + 1) * page.size, data.length);
    var totalRecods = data.length;

    var infoText = (pageStart + 1) + "-" + pageEnd + " of " + totalRecods;
    if (totalRecods < page.size) {
      infoText = totalRecods + " Record" + (totalRecods != 1 ? "s" : "");
    }
    if (columns.total > columns.visible) {
      infoText = infoText + (long ? " Rows" : "") + " | " + (columns.number + 1) + "-" +
        (Math.min(columns.number + columns.visible, columns.total)) +
        " of " + columns.total + (long ? " Columns" : "");
    }

    return infoText;
  };

  var renderFooter = function() {
    var footer = pagedTable.querySelectorAll("div.pagedtable-footer")[0];
    footer.innerHTML = "";

    var next = document.createElement("a");
    next.appendChild(document.createTextNode("Next"));
    next.onclick = function() {
      page.setPageNumber(page.number + 1);
      renderBody();
      renderFooter();
    };
    if (data.length > page.size) footer.appendChild(next);

    var pageNumbers = document.createElement("div");
    pageNumbers.setAttribute("class", "pagedtable-indexes");

    var pageRange = page.getVisiblePageRange();
    for (var idxPage = pageRange.start; idxPage < pageRange.end; idxPage++) {
      var pageLink = document.createElement("a");
      pageLinkClass = idxPage === page.number ? "pagedtable-index pagedtable-index-current" : "pagedtable-index";
      pageLink.setAttribute("class", pageLinkClass);
      pageLink.setAttribute("data-page-index", idxPage);
      pageLink.onclick = function() {
        page.setPageNumber(parseInt(this.getAttribute("data-page-index")));
        renderBody();
        renderFooter();
      };

      pageLink.appendChild(document.createTextNode(idxPage + 1));
      pageNumbers.appendChild(pageLink);
    }
    if (data.length > page.size) footer.appendChild(pageNumbers);

    var previous = document.createElement("a");
    previous.appendChild(document.createTextNode("Previous"));
    previous.onclick = function() {
      page.setPageNumber(page.number - 1);
      renderBody(pagedTable);
      renderFooter(pagedTable);
    };
    if (data.length > page.size) footer.appendChild(previous);

    var infoLabel = document.createElement("div");
    infoLabel.setAttribute("class", "pagedtable-info");
    infoLabel.setAttribute("title", getLabelInfo(true));
    infoLabel.appendChild(document.createTextNode(getLabelInfo(false)));
    footer.appendChild(infoLabel);

    var enabledClass = "pagedtable-index-nav";
    var disabledClass = "pagedtable-index-nav pagedtable-index-nav-disabled";
    previous.setAttribute("class", page.number <= 0 ? disabledClass : enabledClass);
    next.setAttribute("class", (page.number + 1) * page.size >= data.length ? disabledClass : enabledClass);
  };

  this.render = function() {
    var tableDiv = document.createElement("div");
    pagedTable.appendChild(tableDiv);
    var pagedTableClass = (data.length > 0) ? "pagedtable pagedtable-not-empty" : "pagedtable pagedtable-empty";
    tableDiv.setAttribute("class", pagedTableClass);

    var table = document.createElement("table");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("class", "table table-condensed");
    tableDiv.appendChild(table);

    table.appendChild(document.createElement("thead"));
    table.appendChild(document.createElement("tbody"));

    var footerDiv = document.createElement("div");
    footerDiv.setAttribute("class", "pagedtable-footer");
    tableDiv.appendChild(footerDiv);

    renderHeader();
    renderBody();
    renderFooter();
  };

  this.resizeColumns = function() {
    if (pagedTable.offsetWidth > 0) {
      columns.setVisibleColumns(Math.floor(pagedTable.offsetWidth / 100));
      columns.setVisibleColumns(Math.floor(pagedTable.offsetWidth / 100));
      page.setSize(Math.floor(pagedTable.offsetWidth / 100));

      renderHeader();
      renderBody();
      renderFooter();
    }
  };
};

var PagedTableDoc;
(function (PagedTableDoc) {
  var allPagedTables = [];

  PagedTableDoc.renderAll = function() {
    allPagedTables = [];

    var pagedTables = document.querySelectorAll('[data-pagedtable]');
    pagedTables.forEach(function(pagedTable, idx) {
      pagedTable.setAttribute("pagedtable-page", 0);
      pagedTable.setAttribute("class", "pagedtable-wrapper");

      var pagedTableInstance = new PagedTable(pagedTable);
      pagedTableInstance.render();

      allPagedTables.push(pagedTableInstance);
    });
  };

  PagedTableDoc.resizeAll = function() {
    allPagedTables.forEach(function(pagedTable) {
      pagedTable.resizeColumns();
    });
  };

  window.addEventListener("resize", PagedTableDoc.resizeAll);

  return PagedTableDoc;
})(PagedTableDoc || (PagedTableDoc = {}));

window.onload = function() {
  PagedTableDoc.renderAll();
};
