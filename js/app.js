/**
 * Created by Administrator on 2014/7/13.
 */

angular.module("blogApp", [
    "ngRoute",
    "appControllers",
    "appServices"
]).config(["$routeProvider", function ($routeProvider) {
    $routeProvider.when("/home", {
        controller: "indexCtrl",
        templateUrl: "./template/indexPage.html"
    })
        .when("/login", {
            controller: "loginCtrl",
            templateUrl: "./template/login.html"
        })
        .when("/answer", {
            controller: "answerCtrl",
            templateUrl: "./template/answer/answer.html"
        })
        .when("/answerProfiles", {
            controller: "answerProfilesCtrl",
            templateUrl: "./template/answer/answerProfiles.html"
        })
        .when("/recentAnswerRecords", {
            controller: "recentAnswerRecordsCtrl",
            templateUrl: "./template/answer/recentAnswerRecords.html"
        })
        .when("/recentCreditRecords", {
            controller: "recentCreditRecordsCtrl",
            templateUrl: "./template/answer/recentCreditRecords.html"
        })
        .when("/todayAnswerRecords", {
            controller: "todayAnswerRecordsCtrl",
            templateUrl: "./template/answer/todayAnswerRecords.html"
        })
        .when("/subUser", {
            controller: "subUserCtrl",
            templateUrl: "./template/answer/subUser.html"
        })
        .when("/subAbnormal", {
            controller: "subAbnormalCtrl",
            templateUrl: "./template/answer/subAbnormal.html"
        })
        .when("/admin", {
            controller: "adminCtrl",
            templateUrl:"./template/admin/admin.html"
        })
        .when("/questionType", {
            controller: "questionTypeCtrl",
            templateUrl: "./template/admin/questionType.html"
        })
        .when("/user", {
            controller: "userCtrl",
            templateUrl: "./template/admin/user.html"
        })
        .when("/rebate", {
            controller: "rebateCtrl",
            templateUrl: "./template/admin/rebate.html"
        })
        .when("/abnormal", {
            controller: "abnormalCtrl",
            templateUrl: "./template/admin/abnormal.html"
        })
        .when("/subQuestionUser", {
            controller: "subQuestionUserCtrl",
            templateUrl: "./template/question/subQuestionUser.html"
        })
        .when("/subRecharge", {
            controller: "subRechargeCtrl",
            templateUrl: "./template/question/subRecharge.html"
        })
        .when("/subRebate", {
            controller: "subRebateCtrl",
            templateUrl: "./template/question/subRebate.html"
        })
        .when("/chargeRecord", {
            controller: "chargeRecordCtrl",
            templateUrl: "./template/question/chargeRecord.html"
        })
        .when("/recentQuestion", {
            controller: "recentQuestionCtrl",
            templateUrl: "./template/question/recentQuestion.html"
        })
        .when("/historyRecord", {
            controller: "historyRecordCtrl",
            templateUrl: "./template/question/historyRecord.html"
        })
        .when("/personProfile", {
            controller: "personProfileCtrl",
            templateUrl: "./template/question/personProfile.html"
        })
        .when("/other", {
            controller: "otherCtrl",
            templateUrl: "./template/admin/other.html"
        })
        .when("/deposit",{
            controller: "depositCtrl",
            templateUrl: "./template/answer/deposit.html"
        })
        .when("/admindeposit",{
            controller: "admindepositCtrl",
            templateUrl: "./template/admin/admindeposit.html"
        })
        .when("/qDeposit",{
            controller: "qDepositCtrl",
            templateUrl: "./template/question/qDeposit.html"
        })
        .otherwise({
            redirectTo: "/home"
        });
} ]);