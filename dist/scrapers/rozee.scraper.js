"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeRozeeJobs = scrapeRozeeJobs;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
async function scrapeRozeeJobs() {
    const jobs = [];
    for (let page = 1; page <= 5; page++) {
        const url = `https://www.rozee.pk/job/search?page=${page}`;
        const { data } = await axios_1.default.get(url);
        const $ = cheerio.load(data);
        const jobLinks = $("a.job-title").map((i, el) => {
            return "https://www.rozee.pk" + $(el).attr("href");
        }).get();
        for (const link of jobLinks) {
            const job = await scrapeJobDetails(link);
            jobs.push(job);
        }
    }
    return jobs;
}
async function scrapeJobDetails(url) {
    const { data } = await axios_1.default.get(url);
    const $ = cheerio.load(data);
    return {
        title: $("h1").text().trim(),
        company: $(".company-name").text().trim(),
        industry: $(".industry").text().trim(),
        location: $(".location").text().trim(),
        description: $("#job_description").text().trim(),
        salary: $(".salary").text().trim() || null,
        benefits: $(".benefits").text().trim() || null,
        datePosted: $(".date-posted").text().trim(),
        jobType: $(".job-type").text().trim(),
        experience: $(".experience").text().trim(),
        skills: $(".skill-tag").map((i, el) => $(el).text()).get(),
        url
    };
}
