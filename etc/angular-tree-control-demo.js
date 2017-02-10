/**
 * 这是questionCtrl中questionEditController的一段成功的代码，仅作为参考保存
 * @type {{}}
 */
vm.tree = {};
vm.tree.options = {
    nodeChildren: "children",
    dirSelectable: true
};

/** 树形结构的数据结构，含
 * name     节点对应的目录完整路径名称，确保不重复，可作为节点标识符
 * label    节点对应的目录名称，显示时使用
 * isLoaded 是否已经加载，即是否完成数据查询，加载了其子目录信息
 * children 是子节点的数组，如果没有子节点，可定义为{}，确保仍旧显示为目录的图标
 * */
    //vm.tree.data = [];
vm.tree.data = [
    { "name" : "Joe", "age" : "21", "children" : [
        { "name" : "Smith", "age" : "42", "children" : {} },
        { "name" : "Gary", "age" : "21", "children" : [
            { "name" : "Jenifer", "age" : "23", "children" : [
                { "name" : "Dani", "age" : "32", "children" : {} },
                { "name" : "Max", "age" : "34", "children" : {} }
            ]}
        ]}
    ]},
    { "name" : "Albert", "age" : "33", "children" : {} },
    { "name" : "Ron", "age" : "29", "children" : {} }
];
vm.tree.selected = vm.tree.data[0];
//vm.tree.expandedNodes = [vm.tree.data[0]];

vm.treeToggle = function(node, expanded){
    //vm.treeinfo = node.name+ (expanded?" expanded":" collapsed");
};
vm.treeSelected = function(node, selected){

    //vm.treeinfo = node.name+ (selected?" selected":" deselected");
    //vm.tree.expanded = [node];
    //vm.tree.data[0].children.push({ "name" : "Ron1.1", "age" : "29", "children" : {} });
};