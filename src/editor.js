const tagList = [
  {
    tagName: 'table class="table table-bordered"',
    className: 'content__table table'
  },
  {
    tagName: 'thead',
    className: 'table__head'
  },
  {
    tagName: 'tbody',
    className: 'table__body'
  },
  {
    tagName: 'tr',
    className: 'table__row'
  },
  {
    tagName: 'td',
    className: 'table__item'
  }
];

const classList = [
  {
    tagName: 'p',
    className: 'content__text'
  },
  {
    tagName: 'ul',
    className: 'content__bullet list'
  },
  {
    tagName: 'ol',
    className: 'content__order list'
  },
  {
    tagName: 'li',
    className: 'list__item'
  },
  {
    tagName: 'a',
    className: 'content__link content__link_selected',
    classNameExclude: [
      'button'
    ]
  },
  {
    tagName: 'h3',
    className: 'content__text content__text_strong'
  },
  {
    tagName: 'h2',
    className: 'content__header'
  },
  {
    tagName: 'h1',
    className: 'content__title'
  }
];

const walker = (node, callback) => {
  [].slice.call(node.children).forEach(child => {
    callback(child);
    if (child.children.length) {
      walker(child, callback);
    }
  });
};

const setClasses = (ref, tags) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = ref;
  for (let tag of tags) {
    const refTags = wrapper.querySelectorAll(tag.tagName);
    refTags.forEach((refTag) => {
      if (
        !tag.classNameExclude ||
        !refTag.className ||
        tag.classNameExclude.every((className) => {
          return className.indexOf(refTag.className) === -1
        })
      ) {
        refTag.className = tag.className;
      }
    });
  }
  return wrapper.innerHTML;
}

const setTables = (ref, tags) => {
  let content = ref.replace(/\t/g, '');
  for (let tag of tags) {
    const openTag = RegExp(`<${tag.tagName}>`, 'g');
    const closeTag = RegExp(`</${tag.tagName.split(' ')[0]}>`, 'g');
    content = content.replace(openTag, `<div class="${tag.className}">`);
    content = content.replace(closeTag, `</div>`);
  }
  const table = document.createElement('div');
  table.insertAdjacentHTML('afterbegin', content);
  const tableContainer = table.querySelector('.content__table');
  const tableRows = tableContainer.querySelectorAll('.table__row');
  const hasHead = Array.from(tableRows[0].children).every(i => i.innerHTML.match('<b>'));
  if (hasHead) {
    const head = document.createElement('div');
    const headClassName = tags.filter(tag => tag.tagName === 'thead')[0].className;
    head.classList.add(headClassName);
    Array.from(tableRows[0].children).forEach(cell => {
      cell.innerHTML = cell.textContent;
    });
    head.appendChild(tableRows[0]);
    tableContainer.insertBefore(head, tableContainer.children[0]);
  }
  return table.innerHTML;
};

const cleanCode = ref => {
  const container = document.createElement('div');
  container.innerHTML = ref;
  const paras = container.querySelectorAll('p');
  paras.forEach(para => {
    if (para.innerHTML.length === 0 || para.innerHTML.substring(0, 4) === '<br>') {
      para.parentElement.removeChild(para);
    }
  });
  return container.innerHTML;
};

const restoreTables = ref => {
  const render = document.createElement('div');
  render.innerHTML = ref;
  const contentTables = render.querySelectorAll('.content__table');
  contentTables.forEach(contentTable => {
    const rows = contentTable.querySelectorAll('.table__row');
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.classList.add('table', 'table-bordered');
    rows.forEach(row => {
      const tableRow = document.createElement('tr');
      const cells = row.querySelectorAll('.table__item');
      cells.forEach(cell => {
        const tableCell = document.createElement('td');
        if (row.parentElement.className.indexOf('table__head') !== -1) {
          cell.innerHTML = `<b>${cell.textContent}</b>`;
        }
        tableCell.innerHTML = cell.innerHTML;
        tableRow.appendChild(tableCell);
      });
      tbody.appendChild(tableRow);
    });
    table.appendChild(tbody);
    contentTable.parentElement.replaceChild(table, contentTable);
  });
  return render.innerHTML;
};

const format = (node, rules = {}) => {
  let content = node.innerHTML;
  content = content.replace(/\s+/g, ' ');
  for (let rule in rules) {
    if (content.indexOf(rule) !== -1) {
      const regExpChars = ['+'];
      const hasRegExpChars = regExpChars.indexOf(rule.trim()) !== -1;
      const regExpCharsIndex = regExpChars.indexOf(rule.trim());
      const regExpCharsByRule = regExpChars[regExpCharsIndex];
      const pattern = RegExp(
        hasRegExpChars
          ? rule.replace(
              regExpCharsByRule,
              `\\${regExpCharsByRule}`
            )
          : rule,
        'g'
      );
      content = content.replace(pattern, rules[rule]);
    }
  }
  return content;
}

const onPaste = (e) => {
  setTimeout(() => {
    const data = editor.summernote('code');
    const wrapper = document.createElement('div');
    wrapper.insertAdjacentHTML('afterbegin', data);
    walker(wrapper, node => {
      if (node.tagName === 'DIV' && node.textContent.length) {
        const para = document.createElement('p');
        para.textContent = node.textContent;
        node.parentElement.replaceChild(para, node);
      }
      if (
        [
          'COL', 'COLGROUP', 'STYLE',
          'GOOGLE-SHEETS-HTML-ORIGIN'
        ].indexOf(node.tagName) !== -1
      ) {
        node.remove();
      }
      [].slice.call(node.attributes)
        .filter((attr) => {
          return [
            'href',
            'title',
            'src',
            'source'
          ].indexOf(attr.name) === -1;
        })
        .forEach((attr) => node.removeAttribute(attr.name));
      if (node.tagName === 'TABLE') {
        node.className = 'table table-bordered';
      }
      if (node.tagName === 'TBODY') {
        const firstRow = node.children[0];
        const firstRowCells = firstRow.children;
        [].slice.call(firstRowCells)
          .forEach((cell) => {
            cell.innerHTML = `<b>${cell.innerHTML}</b>`;
          });
      }
      node.innerHTML = format(node, {
        '”': '»',
        '“': '«',
        '- " -': '—',
        ' - ': ' — ',
        '- ': ' — '
      });
    });
    editor.summernote('code', wrapper.innerHTML);
  }, 0);
}

const onSave = () => {
  let editorCode = editor.summernote('code');
  editorCode = setClasses(editorCode, classList);
  editorCode = editorCode.indexOf('</table>') !== -1
    ? setTables(editorCode, tagList)
    : editorCode;
  editorCode = cleanCode(editorCode);
  editor.summernote('code', editorCode);
}

window.restoreTables = restoreTables;

window._editor = {
  restoreTables,
  onPaste,
  onSave
}
