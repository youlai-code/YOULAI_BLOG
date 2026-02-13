const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, 'public', 'posts');

const titles = [
    '深入理解JavaScript异步编程模式',
    'Vue3 Composition API最佳实践指南',
    'React Hooks性能优化技巧总结',
    'Node.js微服务架构设计入门',
    'TypeScript高级类型体操实战',
    'CSS Grid布局完全指南',
    'Webpack5模块联邦实战应用',
    '前端工程化最佳实践探索',
    'WebGL入门：打造3D交互体验',
    'PWA应用开发实战教程',
    '前端性能监控与优化策略',
    'Docker容器化部署前端应用',
    'GraphQL API设计最佳实践',
    '前端安全防护XSS与CSRF',
    'WebSocket实时通信应用开发',
    '前端自动化测试完整指南',
    '响应式设计原理与实现',
    '前端状态管理方案对比分析',
    'Web Components原生组件开发',
    '前端代码重构技巧与经验'
];

const tagsPool = [
    ['JavaScript', '异步', 'Promise'],
    ['Vue3', 'Composition API', '前端框架'],
    ['React', 'Hooks', '性能优化'],
    ['Node.js', '微服务', '后端'],
    ['TypeScript', '类型系统', '进阶'],
    ['CSS', 'Grid', '布局'],
    ['Webpack', '构建工具', '工程化'],
    ['前端', '工程化', '最佳实践'],
    ['WebGL', '3D', '图形学'],
    ['PWA', 'Service Worker', '离线应用'],
    ['性能优化', '监控', 'Lighthouse'],
    ['Docker', '容器化', 'DevOps'],
    ['GraphQL', 'API', '数据查询'],
    ['安全', 'XSS', 'CSRF'],
    ['WebSocket', '实时通信', 'Socket.io'],
    ['测试', 'Jest', '自动化'],
    ['响应式', 'CSS', '移动端'],
    ['状态管理', 'Vuex', 'Redux'],
    ['Web Components', '原生', '组件化'],
    ['重构', '代码质量', '最佳实践']
];

const summaries = [
    '本文深入探讨JavaScript异步编程的各种模式，从回调函数到Promise再到async/await，帮助你全面理解异步编程的本质。',
    'Vue3的Composition API带来了全新的代码组织方式，本文通过实际案例讲解如何更好地使用这一特性。',
    'React Hooks虽然方便，但不当使用会导致性能问题。本文总结常见的性能优化技巧。',
    '微服务架构是现代后端开发的重要模式，本文介绍如何使用Node.js构建微服务应用。',
    'TypeScript的类型系统非常强大，本文通过实际案例展示高级类型操作技巧。',
    'CSS Grid是现代布局的利器，本文全面讲解Grid的各种属性和使用场景。',
    'Webpack5的模块联邦功能让微前端变得更加简单，本文通过实战案例演示其用法。',
    '前端工程化是提升开发效率的关键，本文分享团队实践中的经验总结。',
    'WebGL可以让网页呈现3D效果，本文从零开始带你入门WebGL开发。',
    'PWA让Web应用具备原生应用的能力，本文教你如何开发一个完整的PWA应用。',
    '性能是用户体验的关键，本文介绍前端性能监控的方案和优化策略。',
    'Docker让部署变得简单，本文介绍如何将前端应用容器化部署。',
    'GraphQL提供了更灵活的API设计方式，本文讲解其设计最佳实践。',
    '前端安全不容忽视，本文详细介绍XSS和CSRF攻击的防护方法。',
    '实时通信是很多应用的需求，本文介绍WebSocket的开发实践。',
    '自动化测试是保证代码质量的重要手段，本文提供完整的测试指南。',
    '响应式设计让网站适配各种设备，本文讲解其原理和实现方法。',
    '状态管理是前端开发的核心问题，本文对比分析各种解决方案。',
    'Web Components是浏览器原生支持的组件化方案，本文介绍其开发方法。',
    '代码重构是提升代码质量的重要手段，本文分享实用的重构技巧。'
];

function generateContent(title, index) {
    const sections = [
        `# ${title}`,
        '',
        '## 前言',
        `在当今快速发展的前端领域，${title.replace('深入理解', '').replace('完全指南', '').replace('最佳实践', '').replace('入门', '')}已经成为开发者必须掌握的技能之一。本文将从基础概念出发，逐步深入到实际应用。`,
        '',
        '## 基础概念',
        '首先，我们需要了解一些核心概念。这些概念是理解后续内容的基础。',
        '',
        '```javascript',
        '// 示例代码',
        'const example = () => {',
        '    console.log("Hello World");',
        '    return true;',
        '};',
        '```',
        '',
        '## 核心原理',
        '理解核心原理对于掌握这项技术至关重要。下面我们通过几个关键点来分析。',
        '',
        '### 第一点：理解本质',
        '任何技术的学习都应该从本质出发。只有理解了本质，才能在实际应用中游刃有余。',
        '',
        '### 第二点：实践应用',
        '理论知识需要通过实践来巩固。建议读者在学习过程中多动手实践。',
        '',
        '## 实战案例',
        '下面通过一个实际的案例来演示如何应用这些知识。',
        '',
        '```javascript',
        '// 实战代码示例',
        'class Demo {',
        '    constructor() {',
        '        this.data = [];',
        '    }',
        '    ',
        '    add(item) {',
        '        this.data.push(item);',
        '    }',
        '    ',
        '    get() {',
        '        return this.data;',
        '    }',
        '}',
        '```',
        '',
        '## 注意事项',
        '在实际开发中，需要注意以下几点：',
        '',
        '1. 代码规范很重要，保持良好的编码习惯',
        '2. 性能优化要考虑实际场景',
        '3. 安全性不容忽视',
        '4. 可维护性是长期项目的关键',
        '',
        '## 总结',
        `本文介绍了${title}的相关内容，从基础概念到实战应用，希望对读者有所帮助。学习是一个持续的过程，建议在实践中不断探索和总结。`,
        '',
        '## 参考资料',
        '- [MDN Web Docs](https://developer.mozilla.org/)',
        '- [JavaScript.info](https://javascript.info/)',
        '- [GitHub](https://github.com/)'
    ];
    
    return sections.join('\n');
}

function generateDate(index) {
    const baseDate = new Date(2025, 0, 1);
    const randomDays = Math.floor(Math.random() * 365) + index * 5;
    const date = new Date(baseDate.getTime() + randomDays * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function generatePostId(index) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(Math.floor(Math.random() * 24)).padStart(2, '0');
    const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const second = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    return `test_${year}${month}${day}_${String(index).padStart(2, '0')}_${hour}${minute}${second}`;
}

function main() {
    if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
    }

    console.log('开始生成20篇测试文章...\n');

    for (let i = 0; i < 20; i++) {
        const title = titles[i];
        const date = generateDate(i);
        const tags = tagsPool[i];
        const summary = summaries[i];
        const content = generateContent(title, i);
        const postId = generatePostId(i);

        const frontmatterData = {
            title,
            date,
            tags,
            summary,
            cover: null,
            columnId: ''
        };

        const fileContent = matter.stringify(content, frontmatterData);
        const filePath = path.join(POSTS_DIR, `${postId}.md`);

        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log(`[${i + 1}/20] 已生成: ${postId}.md - "${title}"`);
    }

    console.log('\n完成! 已成功生成20篇测试文章。');
    console.log(`文章位置: ${POSTS_DIR}`);
}

main();
