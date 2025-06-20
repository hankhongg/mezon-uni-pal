function beautifier(newsArray) {
    if (!newsArray || !Array.isArray(newsArray) || newsArray.length === 0) {
        return "No news available";
    }
    
    var report = "=================== Today news ===================\n";
    newsArray.forEach((newsItem, index) => {
        if (newsItem.title && newsItem.url) {
            report += `${index + 1}. ${newsItem.title}\n   🔗 ${newsItem.url}\n\n`;
        }
    });
    report += "📩 Gửi số (1, 2, 3...) để xem nội dung chi tiết của tin tức.\n";
    report += `📩 Bạn có thể gửi "uni!" để quay lại từ đầu\n`;
    report += "==================================================";
    return report;
}

function categoryBeautifier(categories) {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return "No categories available";
    }
    
    var report = "================== Chuyên mục tin tức ==================\n";
    categories.forEach((category, index) => {
        if (category.name && category.url) {
            report += `${index + 1}. ${category.name}\n`;
        }
    });
    report += "📩 Gửi số (1, 2, 3...) để xem tin tức của chuyên mục chính.\n";
    report += `📩 Bạn có thể gửi "uni!" để quay lại từ đầu\n`;
    report += "========================================================";
    return report;
}

export { beautifier, categoryBeautifier };