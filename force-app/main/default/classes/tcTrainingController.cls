public class tcTrainingController {
    
    public class tcTrainingException extends Exception {}
    
    public class PageWrappper{
        
        @AuraEnabled public string currentUserId{get; set;}
        @AuraEnabled public string currentUserName{get; set;}
        @AuraEnabled public string currentUserContactId{get; set;}
        @AuraEnabled public string currentUserProfileId{get; set;}
        @AuraEnabled public string currentUserProfileName{get; set;}
        @AuraEnabled public String parentOrgId { get; set; }
        @AuraEnabled public String parentOrgName { get; set; }
        
        @AuraEnabled public List<Account> childOrgs { get; set; }
        @AuraEnabled public List<hed__Course__c> listOfCourses { get; set; }
        @AuraEnabled public List<Contact> listOfTrainers { get; set; }
        @AuraEnabled public List<Contact> listOfSpecialists { get; set; }
        @AuraEnabled public List<Course_Competency__c> listOfCourseCompetency { get; set; }
        
        @AuraEnabled public List<CourseWrapper> listOfCourseWrapper { get; set; }
    }
    public class TrainingWrapper {
        @AuraEnabled Public String id { get; set; }
        @AuraEnabled Public String name { get; set; }
        @AuraEnabled public hed__Course_Offering__c trainingRecord { get; set; }
        
        @AuraEnabled Public String organizationId { get; set; }
        @AuraEnabled Public String organizationName { get; set; }
        @AuraEnabled public List<Account> sites{get; set;}
        @AuraEnabled public List<hed__Course__c> listOfCourses{get; set;}
        @AuraEnabled public List<CoursesWrapper> listOfCoursesWrapper{get; set;}
        @AuraEnabled public List<Contact> listOfTrainers{get; set;}
        @AuraEnabled public List<Contact> listOfSpecialists{get; set;}
        @AuraEnabled public List<Course_Competency__c> listOfCourseCompetency{get;set;}
        @AuraEnabled public Date currentDate;
        @AuraEnabled public Boolean viewTrainers;
        @AuraEnabled public Boolean viewSpecialist;
        @AuraEnabled public Boolean isCollaborative;
        @AuraEnabled public List<Account> listOfCollaboratingAccounts{get;set;}
        @AuraEnabled public List<Id> listOfCollabAccountIds{get;set;}
        @AuraEnabled public List<Id> listOfThirdPartyAccountIds{get;set;}
        @AuraEnabled public List<Account> childOrganizations{get; set;}
        @AuraEnabled public List<hed__Course__c> listOfSelectedCourses{get;set;}
        @AuraEnabled public List<hed__Course__c> listOfNotSelectedCourses{get;set;}
        @AuraEnabled public String currentContactId{get; set;}
        @AuraEnabled public Integer noOfSplallowed{get; set;}
        @AuraEnabled public Map<Id, List<String>> trainerIDtoCertifiedCourseMap {get; set;}
        
        @AuraEnabled public List<hed__Term__c> termPlanList{get; set;}
        @AuraEnabled public List<hed__Plan_Requirement__c> AccountCustomizations{get;set;}
    }
    public class SpecialistWrapper {
        @AuraEnabled public String messageString{get; set;}
        @AuraEnabled public List<Contact> contactList{get; set;}
        @AuraEnabled public Boolean isEmailMatched{get;set;}
        @AuraEnabled public Boolean isExpiredSpecialist{get;set;}
    }
    public class TrainerWrapper {
        
    }
    public class CourseWrapper {
        
    }
    public class CourseCompetenciesWrapper {
        @AuraEnabled public Integer index{get; set;}
        @AuraEnabled public Boolean isAllCompetencyTaught{get; set;}
        @AuraEnabled public String courseId{get; set;}
        @AuraEnabled public Integer actualInitialTime{get;set;}
        @AuraEnabled public Integer actualRecertTime{get;set;}
        @AuraEnabled public List<String> listOfCourseCompetenciesIds{get; set;}
        @AuraEnabled public List<cc_Event_Competency__c> listOfTrainingCourseCompetency{get;set;}
    }
    public class CompetenciesWrapper {
        
    }
    public class CoursesWrapper{
        @AuraEnabled public boolean isSelected{get; set;}
        @AuraEnabled public hed__Course__c course{get; set;}
        
        public CoursesWrapper(hed__Course__c course, boolean selected){
            this.isSelected = selected;
            this.course = course;
        }
    }
    public class InvalidData{
        @AuraEnabled public String trainingId;
        @AuraEnabled public Contact trainer;
        @AuraEnabled public hed__Course__c course;
        @AuraEnabled public Boolean isAssistant;
        @AuraEnabled public String message;
    }
    public class TrainerNSpecialistWrapper{
        @AuraEnabled public List<Contact> listOfSpecialists;
        @AuraEnabled public List<Contact> listOfTrainers;
        
        public TrainerNSpecialistWrapper(List<Contact> sList, List<Contact> tList){
            this.listOfSpecialists  = sList;
            this.listOfTrainers  = tList;
        }
    }
    public class SpecialistValidationWrapper{
        @AuraEnabled public List<String> specialistIdList{get;set;}
        @AuraEnabled public Boolean isPreviousSessionExists{get;set;}
    }
    public class CollabAndThirdPartyAccountsWrapper{
        @AuraEnabled public List<String> listOfThirdPartyAccountIds {get;set;}
        @AuraEnabled public List<String> listOfCollabAccountIds {get;set;}
    }
    public class InvalidOrganizationsWrapper{
        @AuraEnabled public List<String> invalidReceivingOrgList{get;set;}
        @AuraEnabled public List<String> specialistCountExceedingOrgList{get;set;}
        @AuraEnabled public Boolean isValid;
        @AuraEnabled public List<String> childAccountIdList{get;set;}
        @AuraEnabled public List<String> selectedAccountIdList{get;set;}
    }
    
    //Method to initilize and populate all required details on TrainingsPage
    @AuraEnabled(cacheable=true)
    public static TrainingWrapper getInitialTrainingData(String trainingId, String contactId) {
        TrainingWrapper newTrainingWrapper = new TrainingWrapper();
        newTrainingWrapper.listOfCollabAccountIds = new List<Id>();
        newTrainingWrapper.listOfThirdPartyAccountIds = new List<Id>();
        newTrainingWrapper.childOrganizations = new List<Account>();
        newTrainingWrapper.listOfSpecialists = new List<Contact>();
        newTrainingWrapper.listOfTrainers = new List<Contact>();
        newTrainingWrapper.sites = new List<Account>();
        
        try {
            // Query current contact
            Contact currentContact = [SELECT Id, AccountId, Account.Name, Type__c 
                                      FROM Contact 
                                      WHERE Id = :contactId LIMIT 1];
            newTrainingWrapper.viewTrainers = true;
            newTrainingWrapper.viewSpecialist = true;
            
            List<hed__Course_Offering__c> listTraining = new List<hed__Course_Offering__c>();
            if (!String.isBlank(trainingId)) {
                // Query course offering details
                listTraining = [SELECT Id, Name, cc_Course_End_Date__c, cc_Course_Start_Date__c, Finalized__c, Refinalized__c, 
                                Organization__r.Name, Training_Authorization__c, Collaborative_Training__c, cc_City__c, 
                                cc_State_Province__c, cc_Zip_Code__c, Street__c, Recertification_Date__c, Training_Type__c, 
                                Course_Initial_Training_Time__c, Course_Recert_Training_Time__c, Actual_Initial_Training_Time__c, 
                                cc_Training_Description__c, Actual_Recert_Training_Time__c, Grades_Finalized_Date__c, 
                                hed__Course__r.Name, hed__Course__c, hed__Course__r.Training_Type__c, hed__Course__r.cc_Course_Level__c, 
                                Certification_Type__c, hed__Term__r.Name, hed__Term__r.Id, hed__Faculty__r.Name, hed__Faculty__c, 
                                hed__Faculty__r.Id, hed__Faculty__r.FirstName, hed__Faculty__r.LastName, cc_Secondary_Faculty__r.Name, 
                                cc_Secondary_Faculty__c, cc_Secondary_Faculty__r.Id, cc_Secondary_Faculty__r.FirstName, 
                                cc_Secondary_Faculty__r.LastName,
                                (SELECT Id, hed__Contact__c, hed__Contact__r.Name, hed__Numerical_Grade__c, 
                                 hed__Course_Offering__r.hed__Course__c, Event_Competency__c, hed__Contact__r.Email, 
                                 Register__c, hed__Result__c 
                                 FROM hed__Term_Grades__r),
                                (SELECT Course_Offering__c, Id, Name, Registration_Holding__c, Registration_Contact__c, 
                                 Registration_Contact__r.Email, Registration_Contact__r.AccountId, 
                                 Registration_Contact__r.Account.Name, Registration_Contact__r.isEmailBounced, 
                                 Registration_Contact__r.Name 
                                 FROM Registers__r),
                                (SELECT Id, Course_Competency__c, Course_Competency__r.Name, Course_Competency__r.Chapter__c, 
                                 Recert_Time__c, Taught__c, Initial_Time__c, Course_Competency__r.Course__c, 
                                 Course_Competency__r.Course__r.Name, Chapter_Name__c, 
                                 Company_Competency_Requirement_Account__r.Id, Company_Competency_Requirement_Account__c, 
                                 Company_Competency_Requirement_Account__r.Name 
                                 FROM Event_Competencies1__r 
                                 ORDER BY Course_Competency__r.Chapter_Number__c)
                                FROM hed__Course_Offering__c 
                                WHERE Id = :trainingId 
                                AND cc_Course_Offering_Type__c = 'Organization Specialist Training' LIMIT 1];
            }
            
            if (currentContact != null) {
                if (!listTraining.isEmpty()) {
                    // Populate wrapper with training details
                    hed__Course_Offering__c training = listTraining[0];
                    newTrainingWrapper.organizationName = training.Organization__r.Name;
                    newTrainingWrapper.organizationId = training.Organization__c;
                    newTrainingWrapper.trainingRecord = training;
                    newTrainingWrapper.sites = getListOfSites(currentContact);
                    
                    // Query training agreements
                    List<Training_Agreement__c> trainingAgreementsList = [SELECT Id, Agreement_Type__c, Expiration_Date__c, 
                                                                          Start_Date__c, Providing_Organization__c, 
                                                                          Receiving_Organization__c, Receiving_Organization__r.Name, 
                                                                          Number_of_Specialist_Allowed__c 
                                                                          FROM Training_Agreement__c 
                                                                          WHERE Providing_Organization__c = :training.Organization__c 
                                                                          AND Start_Date__c <= :training.cc_Course_Start_Date__c 
                                                                          AND Expiration_Date__c >= :training.cc_Course_Start_Date__c];
                    
                    // Process training agreements
                    for (Training_Agreement__c ta : trainingAgreementsList) {
                        if (ta.Agreement_Type__c == 'Third Party') {
                            newTrainingWrapper.listOfThirdPartyAccountIds.add(ta.Receiving_Organization__c);
                            newTrainingWrapper.noOfSplallowed = Integer.valueOf(ta.Number_of_Specialist_Allowed__c);
                        } else if (ta.Agreement_Type__c == 'Collaborative') {
                            newTrainingWrapper.listOfCollabAccountIds.add(ta.Receiving_Organization__c);
                            newTrainingWrapper.noOfSplallowed = Integer.valueOf(ta.Number_of_Specialist_Allowed__c);
                        }
                    }
                    
                    // Collect trainer IDs
                    List<String> selectedTrainerList = new List<String>();
                    if (training.hed__Faculty__c != null) {
                        selectedTrainerList.add(training.hed__Faculty__c);
                    }
                    if (training.cc_Secondary_Faculty__c != null) {
                        selectedTrainerList.add(training.cc_Secondary_Faculty__c);
                    }
                    
                    // Handle training authorization types
                    TrainingWrapper tempTrainingWrapper = new TrainingWrapper();
                    if (training.Training_Authorization__c == 'Collaborative') {
                        tempTrainingWrapper = getListOfSpecialistsFromCollaboratingAccounts(
                            selectedTrainerList,
                        newTrainingWrapper.organizationId,
                        training.Training_Authorization__c,
                        newTrainingWrapper.listOfCollabAccountIds,
                        newTrainingWrapper.listOfThirdPartyAccountIds,
                        newTrainingWrapper.currentContactId,
                        String.valueOf(training.cc_Course_Start_Date__c)
                            );
                        newTrainingWrapper.listOfSpecialists = tempTrainingWrapper.listOfSpecialists;
                        newTrainingWrapper.listOfTrainers = getListOfTrainers(newTrainingWrapper.organizationId, contactId);
                        newTrainingWrapper.childOrganizations = tempTrainingWrapper.childOrganizations;
                        
                        // Query trainers for collaborative accounts
                        if (!newTrainingWrapper.listOfCollabAccountIds.isEmpty()) {
                            newTrainingWrapper.listOfTrainers.addAll([
                                SELECT Id, Name, FirstName, LastName, Type__c, Certification_Contact_Status__c, 
                                Trainer_Course_Core_Expiration__c, ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                                Trainer_ASM_Grace_Lapse_Date__c, Trainer_SAC_Grace_Lapse_Date__c, 
                                Trainer_SCF_Grace_Lapse_Date__c, Trainer_Core_Expiration_in_Grace__c 
                                FROM Contact 
                                WHERE AccountId IN :newTrainingWrapper.listOfCollabAccountIds 
                                AND Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
                            ]);
                        } else {
                            newTrainingWrapper.listOfTrainers.addAll([
                                SELECT Id, Name, FirstName, LastName, Type__c, Certification_Contact_Status__c, 
                                Trainer_Course_Core_Expiration__c, ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                                Trainer_ASM_Grace_Lapse_Date__c, Trainer_SAC_Grace_Lapse_Date__c, 
                                Trainer_SCF_Grace_Lapse_Date__c, Trainer_Core_Expiration_in_Grace__c 
                                FROM Contact 
                                WHERE Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
                            ]);
                        }
                    } else if (training.Training_Authorization__c == 'Third Party') {
                        tempTrainingWrapper = getListOfSpecialistsFromCollaboratingAccounts(
                            selectedTrainerList,
                        newTrainingWrapper.organizationId,
                        training.Training_Authorization__c,
                        newTrainingWrapper.listOfCollabAccountIds,
                        newTrainingWrapper.listOfThirdPartyAccountIds,
                        newTrainingWrapper.currentContactId,
                        String.valueOf(training.cc_Course_Start_Date__c)
                            );
                        newTrainingWrapper.listOfSpecialists = tempTrainingWrapper.listOfSpecialists;
                        newTrainingWrapper.listOfTrainers = getListOfTrainers(newTrainingWrapper.organizationId, contactId);
                        newTrainingWrapper.childOrganizations = tempTrainingWrapper.childOrganizations;
                        
                        // Query trainers for third-party accounts
                        if (!newTrainingWrapper.listOfThirdPartyAccountIds.isEmpty()) {
                            newTrainingWrapper.listOfTrainers.addAll([
                                SELECT Id, Name, FirstName, LastName, Type__c, Certification_Contact_Status__c, 
                                Trainer_Course_Core_Expiration__c, ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                                Trainer_ASM_Grace_Lapse_Date__c, Trainer_SAC_Grace_Lapse_Date__c, 
                                Trainer_SCF_Grace_Lapse_Date__c, Trainer_Core_Expiration_in_Grace__c 
                                FROM Contact 
                                WHERE AccountId IN :newTrainingWrapper.listOfThirdPartyAccountIds 
                                AND Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
                            ]);
                        } else {
                            newTrainingWrapper.listOfTrainers.addAll([
                                SELECT Id, Name, FirstName, LastName, Type__c, Certification_Contact_Status__c, 
                                Trainer_Course_Core_Expiration__c, ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                                Trainer_ASM_Grace_Lapse_Date__c, Trainer_SAC_Grace_Lapse_Date__c, 
                                Trainer_SCF_Grace_Lapse_Date__c, Trainer_Core_Expiration_in_Grace__c 
                                FROM Contact 
                                WHERE Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
                            ]);
                        }
                        
                        // Collect account IDs for child organizations
                        List<String> accId = new List<String> { newTrainingWrapper.organizationId };
                        for (Account site : newTrainingWrapper.sites) {
                            accId.add(site.Id);
                        }
                        for (Id thirdPartyAccountId : newTrainingWrapper.listOfThirdPartyAccountIds) {
                            accId.add(thirdPartyAccountId);
                        }
                        newTrainingWrapper.childOrganizations.addAll([
                            SELECT Id, Name 
                            FROM Account 
                            WHERE Id IN :accId
                        ]);
                    } else {
                        // Default case: no specific training authorization
                        newTrainingWrapper.listOfTrainers = getListOfTrainers(newTrainingWrapper.organizationId, contactId);
                        newTrainingWrapper.listOfSpecialists = getListOfSpecialists(new List<String> { newTrainingWrapper.organizationId }, new List<String>());
                        List<String> accId = new List<String> { newTrainingWrapper.organizationId };
                        for (Account site : newTrainingWrapper.sites) {
                            accId.add(site.Id);
                        }
                        newTrainingWrapper.childOrganizations.addAll([SELECT Id, Name FROM Account WHERE Id IN :accId ]);
                    }
                } else {
                    // No training found, populate basic wrapper details
                    newTrainingWrapper.organizationName = currentContact.Account.Name;
                    newTrainingWrapper.organizationId = currentContact.AccountId;
                }
                
                newTrainingWrapper.currentDate = System.today();
                newTrainingWrapper.currentContactId = currentContact.Id;
                newTrainingWrapper.sites = getListOfSites(currentContact);
                
                // Query courses
                Set<String> accIdsSet = new Set<String>();
                for (Account acc : newTrainingWrapper.sites) {
                    accIdsSet.add(acc.Id);
                }
                Map<Id, hed__Course__c> courseMap = new Map<Id, hed__Course__c>([
                    SELECT Id, Name, cc_Course_Level__c, Certification_Type__c, cc_Related_Trainer_Course__c, 
                    cc_Related_Trainer_Course__r.Certification_Type__c, Training_Type__c
                    FROM hed__Course__c
                    WHERE Active__c = true 
                    AND Is_Specialist_Course__c = true 
                    AND (hed__Account__c IN :accIdsSet OR hed__Account__r.Name = 'QBS LLC')
                    ORDER BY Name
                ]);
                newTrainingWrapper.listOfCourses = courseMap.values();
                if (!newTrainingWrapper.listOfCourses.isEmpty()) {
                    newTrainingWrapper.listOfCoursesWrapper = new List<CoursesWrapper>();
                    for (hed__Course__c course : newTrainingWrapper.listOfCourses) {
                        newTrainingWrapper.listOfCoursesWrapper.add(new CoursesWrapper(course, false));
                    }
                }
                
                // Handle case when no training is provided
                if (listTraining.isEmpty()) {
                    newTrainingWrapper.listOfTrainers = getListOfTrainers(currentContact.AccountId, contactId);
                    List<String> accIds = new List<String> { currentContact.AccountId };
                    for (Account site : newTrainingWrapper.sites) {
                        accIds.add(site.Id);
                    }
                    newTrainingWrapper.listOfSpecialists.addAll(
                    getListOfSpecialists(accIds, new List<String> { newTrainingWrapper.currentContactId })
                    );
                    newTrainingWrapper.childOrganizations.addAll([
                        SELECT Id, Name 
                        FROM Account 
                        WHERE Id IN :accIds
                    ]);
                }
                
                // Query course competencies
                if (!newTrainingWrapper.listOfCourses.isEmpty()) {
                    newTrainingWrapper.listOfCourseCompetency = [
                        SELECT Id, Course__c, Name, Chapter__c, Initial_Time__c, Recert_Time__c, Chapter_Number__c 
                        FROM Course_Competency__c 
                        WHERE Course__c IN :courseMap.keySet() 
                        ORDER BY Chapter_Number__c
                    ];
                }
                
                // Create trainer to certified course map
                newTrainingWrapper.trainerIDtoCertifiedCourseMap = getTrainerIDtoCertifiedCourseMap(
                    newTrainingWrapper.listOfTrainers,
                listTraining.isEmpty() ? Date.today().format() : listTraining[0].cc_Course_End_Date__c.format()
                    );
                
                // Query account customizations
                newTrainingWrapper.AccountCustomizations = [
                    SELECT Id, Name, Account__c, Chapter_Name__c, Chapter_Number__c, Course_Offering__c, 
                    hed__Course__c, Competencies__c, Competencies__r.Initial_Time__c, Competencies__r.Recert_Time__c
                    FROM hed__Plan_Requirement__c 
                    WHERE Account__c = :currentContact.AccountId 
                    OR Account__c IN :newTrainingWrapper.childOrganizations
                ];
                
                // Initialize term plan list
                newTrainingWrapper.termPlanList = new List<hed__Term__c>();
            }
        } catch (Exception ex) {
            throw new tcTrainingException('Error occurred while creating training wrapper: ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        return newTrainingWrapper;
    }
    
    @AuraEnabled
    public static SpecialistWrapper insertNewSpecialist(String accountId, String firstName, String lastName, String email, String department, Boolean isValidate, String contactId, String contactType) {
        SpecialistWrapper specialistWrapper = new SpecialistWrapper();
        specialistWrapper.contactList = new List<Contact>();
        specialistWrapper.isEmailMatched = false;
        specialistWrapper.isExpiredSpecialist = false;
        
        try {
            // Handle validation logic for existing contacts
            if (isValidate) {
                List<List<SObject>> searchList;
                List<Contact> listOfExistingContact = new List<Contact>();
                String name = firstName + ' ' + lastName;
                
                // Search by email if provided
                if (!String.isBlank(email)) {
                    searchList = [FIND :email IN EMAIL FIELDS
                        RETURNING Contact (Id, Name, FirstName, LastName, Email, Type__c, Account.Name
                        WHERE AccountId = :accountId)
                        WITH SPELL_CORRECTION = true];
                    listOfExistingContact = (List<Contact>)searchList[0];
                    
                    if (!listOfExistingContact.isEmpty()) {
                        specialistWrapper.contactList = listOfExistingContact;
                        specialistWrapper.messageString = 'message1';
                        specialistWrapper.isEmailMatched = true;
                        return specialistWrapper;
                    }
                    
                    // If no email match, search by name
                    searchList = [FIND :name IN ALL FIELDS
                        RETURNING Contact (Id, Name, FirstName, LastName, Email, Type__c, Account.Name
                        WHERE AccountId = :accountId)
                        WITH SPELL_CORRECTION = true];
                    listOfExistingContact = (List<Contact>)searchList[0];
                    
                    if (!listOfExistingContact.isEmpty()) {
                        specialistWrapper.contactList = listOfExistingContact;
                        specialistWrapper.messageString = 'message2';
                        return specialistWrapper;
                    }
                } else {
                    // Search by name if no email provided
                    searchList = [FIND :name IN ALL FIELDS
                        RETURNING Contact (Id, Name, FirstName, LastName, Email, Type__c, Account.Name
                        WHERE AccountId = :accountId)
                        WITH SPELL_CORRECTION = true];
                    listOfExistingContact = (List<Contact>)searchList[0];
                    
                    if (!listOfExistingContact.isEmpty()) {
                        specialistWrapper.contactList = listOfExistingContact;
                        specialistWrapper.messageString = 'message1';
                        specialistWrapper.isEmailMatched = true;
                        return specialistWrapper;
                    }
                }
            }
            
            // Create or update contact
            Contact con = new Contact();
            if (!String.isBlank(contactId)) {
                con.Id = contactId;
            }
            if (!String.isBlank(accountId)) {
                con.AccountId = accountId;
            }
            con.FirstName = firstName;
            con.LastName = lastName;
            con.Email = String.isBlank(email) ? null : email.trim();
            con.Department = department;
            
            // Set contact type for Expired Specialist
            if (contactType == 'Expired Specialist') {
                specialistWrapper.isExpiredSpecialist = true;
            }
            
            specialistWrapper.contactList.add(con);
            specialistWrapper.messageString = 'success';
            return specialistWrapper;
        } catch (Exception ex) {
            specialistWrapper.messageString = 'Error: ' + ex.getMessage();
            return specialistWrapper;
        }
    }
    
    public static List<InvalidData> saveTraining(String contactId, List<hed__Course__c> coursesList, List<Contact> trainerList,
    hed__Course_Offering__c TrainingDetails, String trainingId, String organizationId,
    String trainingType, String startDate, String endDate, List<String> selectedCourseIds,
    List<String> selectedTrainersIds, List<String> selectedSpecialistIds,
    String listOfSelectedCourseCompetenciesWrapperStr, Boolean isCollaborative,
    String trainingType2, List<Contact> specialistToBeInserted, String termId,
    String certificationType) {
        
        List<InvalidData> listOfInvalidData = new List<InvalidData>();
        
        try {
            // Validate input parameters
            if (selectedCourseIds == null || selectedCourseIds.isEmpty()) {
                InvalidData invalidData = new InvalidData();
                invalidData.message = 'No courses selected for training';
                listOfInvalidData.add(invalidData);
                return listOfInvalidData;
            }
            
            // Deserialize competencies wrapper
            List<CourseCompetenciesWrapper> listOfSelectedCourseCompetenciesWrapper = new List<CourseCompetenciesWrapper>();
            if (String.isNotBlank(listOfSelectedCourseCompetenciesWrapperStr)) {
                listOfSelectedCourseCompetenciesWrapper = (List<CourseCompetenciesWrapper>)JSON.deserialize(
                    listOfSelectedCourseCompetenciesWrapperStr, List<CourseCompetenciesWrapper>.class);
            }
            
            // Query course information
            List<hed__Course__c> courseList = [SELECT Id, Name, Certification_Type__c, cc_Related_Trainer_Course__c, 
                                              cc_Related_Trainer_Course__r.Certification_Type__c, Training_Type__c
                                              FROM hed__Course__c 
                                              WHERE Id IN :selectedCourseIds];
            
            if (courseList.isEmpty()) {
                InvalidData invalidData = new InvalidData();
                invalidData.message = 'Selected courses not found';
                listOfInvalidData.add(invalidData);
                return listOfInvalidData;
            }
            
            // Build training course name and certification mapping
            String trainingCourseName = '';
            Map<String, String> certificationNCourseMap = new Map<String, String>();
            
            for (Integer i = 0; i < courseList.size(); i++) {
                hed__Course__c course = courseList[i];
                trainingCourseName += (i == 0) ? course.Name : ', ' + course.Name;
                
                if (String.isNotBlank(course.Certification_Type__c)) {
                    certificationNCourseMap.put(course.Certification_Type__c, course.Name);
                }
            }
            
            // Validate and get default term
            if (String.isBlank(termId)) {
                Default_Specialist_Term__c defaultTerm = Default_Specialist_Term__c.getOrgDefaults();
                if (defaultTerm?.Specialist_Term_Id__c != null && !String.isBlank(defaultTerm.Specialist_Term_Id__c)) {
                    termId = defaultTerm.Specialist_Term_Id__c;
                }
            }
            
            // Validate term exists and is active
            if (String.isNotBlank(termId)) {
                List<hed__Term__c> termRecords = [SELECT Id, Name, Active__c 
                                                 FROM hed__Term__c 
                                                 WHERE Active__c = true AND Id = :termId];
                if (termRecords.isEmpty()) {
                    InvalidData invalidData = new InvalidData();
                    invalidData.message = 'No active Term found for specialist training';
                    listOfInvalidData.add(invalidData);
                    return listOfInvalidData;
                }
            } else {
                InvalidData invalidData = new InvalidData();
                invalidData.message = 'No Term ID for specialist training found';
                listOfInvalidData.add(invalidData);
                return listOfInvalidData;
            }
            
            // Initialize training object
            hed__Course_Offering__c objTraining;
            Boolean isUpdate = String.isNotBlank(trainingId);
            
            if (isUpdate) {
                // Update existing training
                List<hed__Course_Offering__c> existingTrainings = [SELECT Id, Name, Grades_Finalized_Date__c, Finalized__c, 
                                                                  Refinalized__c, hed__Term__c, Training_Type__c, Certification_Type__c
                                                                  FROM hed__Course_Offering__c 
                                                                  WHERE Id = :trainingId];
                
                if (existingTrainings.isEmpty()) {
                    InvalidData invalidData = new InvalidData();
                    invalidData.message = 'Training record not found';
                    listOfInvalidData.add(invalidData);
                    return listOfInvalidData;
                }
                
                objTraining = existingTrainings[0];
            } else {
                // Create new training
                objTraining = new hed__Course_Offering__c();
            }
            
            // Set training fields
            objTraining.hed__Course__c = courseList[0].Id;
            objTraining.hed__Term__c = termId;
            objTraining.Organization__c = organizationId;
            objTraining.Training_Type__c = courseList[0].Training_Type__c;
            objTraining.cc_Course_Offering_Type__c = 'Organization Specialist Training';
            objTraining.Refinalized__c = false;
            
            // Set trainer information
            if (!trainerList.isEmpty() && trainerList[0]?.Id != null && !String.isBlank(trainerList[0].Id)) {
                objTraining.hed__Faculty__c = trainerList[0].Id;
            }
            
            if (trainerList.size() > 1 && trainerList[1]?.Id != null && !String.isBlank(trainerList[1].Id)) {
                objTraining.cc_Secondary_Faculty__c = trainerList[1].Id;
            }
            
            // Set training authorization
            if (trainingType2 == 'Collaborative' || trainingType2 == 'Third Party') {
                objTraining.Training_Authorization__c = trainingType2;
            }
            
            // Set dates
            if (String.isNotBlank(startDate)) {
                Date startDateValue = Date.valueOf(startDate);
                objTraining.Course_Start_Date_and_Time__c = startDateValue;
                objTraining.hed__Start_Date__c = startDateValue;
                objTraining.cc_Course_Start_Date__c = startDateValue;
                objTraining.Expiration_Date__c = startDateValue.addMonths(12);
            }
            
            if (String.isNotBlank(endDate)) {
                Date endDateValue = Date.valueOf(endDate);
                objTraining.Course_End_Date_and_Time__c = endDateValue;
                objTraining.hed__End_Date__c = endDateValue;
                objTraining.cc_Course_End_Date__c = endDateValue;
            }
            
            // Set certification type
            if (String.isNotBlank(certificationType)) {
                objTraining.Certification_Type__c = certificationType;
            }
            
            // Set training details if provided
            if (TrainingDetails != null) {
                objTraining.cc_City__c = TrainingDetails.Shipping_City__c;
                objTraining.cc_State_Province__c = TrainingDetails.Shipping_State__c;
                objTraining.cc_Zip_Code__c = TrainingDetails.Shipping_Postal_Code__c;
                objTraining.cc_Training_Description__c = TrainingDetails.cc_Training_Description__c;
                objTraining.Street__c = TrainingDetails.Street__c;
                
                if (TrainingDetails.Course_Initial_Training_Time__c != null) {
                    objTraining.Course_Initial_Training_Time__c = TrainingDetails.Course_Initial_Training_Time__c;
                    objTraining.Actual_Initial_Training_Time__c = TrainingDetails.Actual_Initial_Training_Time__c;
                }
                
                if (TrainingDetails.Course_Recert_Training_Time__c != null) {
                    objTraining.Course_Recert_Training_Time__c = TrainingDetails.Course_Recert_Training_Time__c;
                    objTraining.Actual_Recert_Training_Time__c = TrainingDetails.Actual_Recert_Training_Time__c;
                }
            }
            
            // Save training record
            if (isUpdate) {
                update objTraining;
            } else {
                insert objTraining;
            }
            
            // Process competencies
            if (listOfSelectedCourseCompetenciesWrapper != null && !listOfSelectedCourseCompetenciesWrapper.isEmpty()) {
                processTrainingCompetencies(objTraining.Id, listOfSelectedCourseCompetenciesWrapper);
            }
            
            // Process specialists
            List<String> finalSpecialistIds = processSpecialists(specialistToBeInserted, selectedSpecialistIds);
            
            // Process registrations
            processRegistrations(objTraining, finalSpecialistIds, contactId, certificationType);
            
            // Return success
            InvalidData successData = new InvalidData();
            successData.trainingId = objTraining.Id;
            listOfInvalidData.add(successData);
            
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Error in saveTraining: ' + ex.getMessage() + '\n' + ex.getStackTraceString());
            InvalidData errorData = new InvalidData();
            errorData.message = 'Error processing training: ' + ex.getMessage();
            listOfInvalidData.add(errorData);
            throw new tcTrainingException('Error in saveTraining: ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        return listOfInvalidData;
    }

    /////////// HELPER METHODS /////////////
    // Helper method to process training competencies
    private static void processTrainingCompetencies(Id trainingId, List<CourseCompetenciesWrapper> competenciesWrappers) {
        List<cc_Event_Competency__c> competenciesToUpsert = new List<cc_Event_Competency__c>();
        List<Id> courseCompetencyIds = new List<Id>();
        List<Id> accountCompetencyIds = new List<Id>();
        
        // Collect all competencies from wrappers
        for (CourseCompetenciesWrapper wrapper : competenciesWrappers) {
            if (wrapper.listOfTrainingCourseCompetency != null) {
                for (cc_Event_Competency__c competency : wrapper.listOfTrainingCourseCompetency) {
                    if (competency.Course_Competency__c != null) {
                        courseCompetencyIds.add(competency.Course_Competency__c);
                    }
                    if (competency.Company_Competency_Requirement_Account__c != null) {
                        accountCompetencyIds.add(competency.Company_Competency_Requirement_Account__c);
                    }
                }
            }
        }
        
        // Query related competency data
        Map<Id, Course_Competency__c> courseCompetencyMap = new Map<Id, Course_Competency__c>(
            [SELECT Id, Name, Chapter_Number__c FROM Course_Competency__c WHERE Id IN :courseCompetencyIds]
            );
        
        Map<Id, hed__Plan_Requirement__c> accountCompetencyMap = new Map<Id, hed__Plan_Requirement__c>(
            [SELECT Id, Name, Chapter_Number__c FROM hed__Plan_Requirement__c WHERE Id IN :accountCompetencyIds]
            );
        
        // Query existing competencies for this training
        List<cc_Event_Competency__c> existingCompetencies = [SELECT Id, Course_Competency__c, 
                                                             Company_Competency_Requirement_Account__c
                                                             FROM cc_Event_Competency__c 
                                                             WHERE cc_Course_Offering__c = :trainingId];
        
        Set<Id> existingCompetencyIds = new Set<Id>();
        for (cc_Event_Competency__c existing : existingCompetencies) {
            existingCompetencyIds.add(existing.Id);
        }
        
        // Process competencies for upsert
        for (CourseCompetenciesWrapper wrapper : competenciesWrappers) {
            if (wrapper.listOfTrainingCourseCompetency != null) {
                for (cc_Event_Competency__c competency : wrapper.listOfTrainingCourseCompetency) {
                    cc_Event_Competency__c objCompetency = new cc_Event_Competency__c();
                    
                    // Set ID if this is an update
                    if (competency.Id != null && !String.isBlank(competency.Id)) {
                        objCompetency.Id = competency.Id;
                    }
                    
                    objCompetency.cc_Course_Offering__c = trainingId;
                    objCompetency.Name = competency.Name;
                    objCompetency.Chapter_Name__c = competency.Chapter_Name__c;
                    objCompetency.Recert_Time__c = competency.Recert_Time__c;
                    objCompetency.Initial_Time__c = competency.Initial_Time__c;
                    objCompetency.Taught__c = competency.Taught__c;
                    
                    // Set course competency
                    if (competency.Course_Competency__c != null) {
                        objCompetency.Course_Competency__c = competency.Course_Competency__c;
                        if (courseCompetencyMap.containsKey(competency.Course_Competency__c)) {
                            objCompetency.Chapter_Number__c = courseCompetencyMap.get(competency.Course_Competency__c).Chapter_Number__c;
                        }
                    }
                    
                    // Set account competency
                    if (competency.Company_Competency_Requirement_Account__c != null) {
                        objCompetency.Company_Competency_Requirement_Account__c = competency.Company_Competency_Requirement_Account__c;
                        if (accountCompetencyMap.containsKey(competency.Company_Competency_Requirement_Account__c)) {
                            objCompetency.Chapter_Number__c = accountCompetencyMap.get(competency.Company_Competency_Requirement_Account__c).Chapter_Number__c;
                        }
                    }
                    
                    competenciesToUpsert.add(objCompetency);
                }
            }
        }
        
        // Identify competencies to delete (existing but not in new list)
        Set<Id> newCompetencyIds = new Set<Id>();
        for (cc_Event_Competency__c comp : competenciesToUpsert) {
            if (comp.Id != null) {
                newCompetencyIds.add(comp.Id);
            }
        }
        
        List<cc_Event_Competency__c> competenciesToDelete = new List<cc_Event_Competency__c>();
        for (cc_Event_Competency__c existing : existingCompetencies) {
            if (!newCompetencyIds.contains(existing.Id)) {
                competenciesToDelete.add(existing);
            }
        }
        
        // Perform DML operations
        if (!competenciesToDelete.isEmpty()) {
            delete competenciesToDelete;
        }
        
        if (!competenciesToUpsert.isEmpty()) {
            upsert competenciesToUpsert;
        }
    }
    // Helper method to process specialists
    private static List<String> processSpecialists(List<Contact> specialistToBeInserted, List<String> selectedSpecialistIds) {
        List<String> finalSpecialistIds = new List<String>();
        
        if (specialistToBeInserted != null && !specialistToBeInserted.isEmpty()) {
            List<Contact> specialistsToInsert = new List<Contact>();
            List<Contact> specialistsToUpdate = new List<Contact>();
            Set<String> processedIds = new Set<String>();
            
            // Separate contacts for insert vs update
            for (Contact specialist : specialistToBeInserted) {
                String specialistId = specialist.Id;
                
                if (String.isNotBlank(specialistId) && !processedIds.contains(specialistId)) {
                    processedIds.add(specialistId);
                    specialistsToUpdate.add(specialist);
                    finalSpecialistIds.add(specialistId);
                } else if (String.isBlank(specialistId)) {
                    specialist.Id = null;
                    specialistsToInsert.add(specialist);
                }
            }
            
            // Insert new specialists
            if (!specialistsToInsert.isEmpty()) {
                Database.DMLOptions dmlOptions = new Database.DMLOptions();
                dmlOptions.DuplicateRuleHeader.allowSave = true;
                dmlOptions.DuplicateRuleHeader.runAsCurrentUser = true;
                Database.insert(specialistsToInsert, dmlOptions);
                
                for (Contact specialist : specialistsToInsert) {
                    finalSpecialistIds.add(specialist.Id);
                }
            }
            
            // Update existing specialists
            if (!specialistsToUpdate.isEmpty()) {
                Database.DMLOptions dmlOptions = new Database.DMLOptions();
                dmlOptions.DuplicateRuleHeader.allowSave = true;
                dmlOptions.DuplicateRuleHeader.runAsCurrentUser = true;
                Database.update(specialistsToUpdate, dmlOptions);
            }
        }
        
        // Add any additional selected specialist IDs
        if (selectedSpecialistIds != null) {
            for (String specialistId : selectedSpecialistIds) {
                if (!finalSpecialistIds.contains(specialistId)) {
                    finalSpecialistIds.add(specialistId);
                }
            }
        }
        
        return finalSpecialistIds;
    }
    // Helper method to process registrations
    private static void processRegistrations(hed__Course_Offering__c training, List<String> specialistIds, String contactId, String certificationType) {
        if (specialistIds == null || specialistIds.isEmpty()) {
            return;
        }
        
        // Query training with existing registrations
        List<hed__Course_Offering__c> trainingWithRegs = [SELECT Id, Name,
                                                          (SELECT Id, Course_Offering__c, Registration_Contact__c, Status__c
                                                           FROM Registers__r)
                                                          FROM hed__Course_Offering__c 
                                                          WHERE Id = :training.Id];
        
        // Get contact information for specialists
        Map<Id, Contact> specialistMap = new Map<Id, Contact>(
            [SELECT Id, Name, Email, AccountId FROM Contact WHERE Id IN :specialistIds]
            );
        
        // Map existing registrations by contact
        Map<Id, cc_Register__c> existingRegMap = new Map<Id, cc_Register__c>();
        if (!trainingWithRegs.isEmpty() && trainingWithRegs[0].Registers__r != null) {
            for (cc_Register__c reg : trainingWithRegs[0].Registers__r) {
                existingRegMap.put(reg.Registration_Contact__c, reg);
            }
        }
        
        // Create/update registrations
        List<cc_Register__c> registrationsToUpsert = new List<cc_Register__c>();
        Set<String> processedSpecialistIds = new Set<String>();
        
        for (String specialistId : specialistIds) {
            if (specialistMap.containsKey(specialistId)) {
                Contact specialist = specialistMap.get(specialistId);
                cc_Register__c registration = new cc_Register__c();
                
                // Set ID if updating existing registration
                if (existingRegMap.containsKey(specialistId)) {
                    registration.Id = existingRegMap.get(specialistId).Id;
                }
                
                registration.Course_Offering__c = training.Id;
                registration.Registration_Contact__c = specialistId;
                registration.Certification_Type__c = certificationType;
                registration.Billing_Contact__c = contactId;
                registration.Ordered_By__c = contactId;
                registration.Email__c = specialist.Email;
                registration.Company__c = specialist.AccountId;
                
                registrationsToUpsert.add(registration);
                processedSpecialistIds.add(specialistId);
            }
        }
        
        // Identify registrations to delete
        List<cc_Register__c> registrationsToDelete = new List<cc_Register__c>();
        for (Id existingContactId : existingRegMap.keySet()) {
            if (!processedSpecialistIds.contains(existingContactId)) {
                registrationsToDelete.add(existingRegMap.get(existingContactId));
            }
        }
        
        // Delete related records first
        if (!registrationsToDelete.isEmpty()) {
            // Delete term grades
            List<hed__Term_Grade__c> termGradesToDelete = [SELECT Id FROM hed__Term_Grade__c 
                                                          WHERE Register__c IN :registrationsToDelete];
            if (!termGradesToDelete.isEmpty()) {
                delete termGradesToDelete;
            }
            
            // Delete certificate expirations
            List<Certificate_Expiration__c> certExpToDelete = [SELECT Id FROM Certificate_Expiration__c 
                                                              WHERE Register__c IN :registrationsToDelete];
            if (!certExpToDelete.isEmpty()) {
                delete certExpToDelete;
            }
            
            // Delete registrations
            delete registrationsToDelete;
        }
        
        // Upsert registrations
        if (!registrationsToUpsert.isEmpty()) {
            upsert registrationsToUpsert;
        }
    }
    public static Map<Id, List<String>> getTrainerIDtoCertifiedCourseMap(List<Contact> listOfTrainers, String endDateString) {
        System.debug('###733 certified Map endDateString -> ' + endDateString);
        Map<Id, List<String>> trainerIDtoCertifiedCourseMap = new Map<Id, List<String>>();
        Date endDate;
        if(endDateString != null && endDateString != ''){
            if(endDateString.contains('/')) {
                endDate = Date.parse(endDateString);
            }
            else {
                endDate = Date.valueOf(endDateString);
            }
        }
        else {
            endDate = Date.Today();
        }
        
        System.debug('###733 certified Map endDate -> ' + endDate);
        System.debug('###733 certified listOfTrainers -> ' + listOfTrainers);
        
        for(Contact trainer : listOfTrainers) {
            
            if(!trainerIDtoCertifiedCourseMap.containsKey(trainer.Id)) {
                trainerIDtoCertifiedCourseMap.put(trainer.Id, new List<String>());
                
                if(trainer.Trainer_Course_Core_Expiration__c != null && trainer.Trainer_Course_Core_Expiration__c >= endDate) {
                    trainerIDtoCertifiedCourseMap.get(trainer.Id).add('Safety-Care Core');
                }
                if(trainer.ASM_Exp_Date__c != null && trainer.ASM_Exp_Date__c >= endDate) {
                    trainerIDtoCertifiedCourseMap.get(trainer.Id).add('Advanced Skills Module');
                }
                if(trainer.SAC_Exp_Date__c != null && trainer.SAC_Exp_Date__c >= endDate) {
                    trainerIDtoCertifiedCourseMap.get(trainer.Id).add('School-Age Children');
                }
                if(trainer.SCF_Exp_Date__c != null && trainer.SCF_Exp_Date__c >= endDate) {
                    trainerIDtoCertifiedCourseMap.get(trainer.Id).add('Safety-Care for Families');
                }
            }
        }
        
        System.debug('###733 certified Map -> ' + trainerIDtoCertifiedCourseMap);
        
        return trainerIDtoCertifiedCourseMap;
    }
    public static List<Contact> getListOfTrainers(Id selectedOrgId, String conId) {
        List<Contact> listOfTrainers = new List<Contact>();
        List<Id> listOfAccountIds = new List<Id>();
        
        try {
            // Query current contact
            Contact currentContact = [SELECT Id, AccountId, Account.Name, Type__c 
                                    FROM Contact 
                                    WHERE Id = :conId 
                                    LIMIT 1];
            
            // Collect account IDs
            listOfAccountIds.add(currentContact.AccountId);
            List<Account> listOfChildAccounts = getListOfSites(currentContact);
            
            // Add child account IDs to the list
            for (Account acc : listOfChildAccounts) {
                listOfAccountIds.add(acc.Id);
            }
            
            // Query trainers based on account IDs and certification status
            listOfTrainers = [
                SELECT Id, Name, FirstName, LastName, Type__c, Certification_Contact_Status__c, 
                    Trainer_Course_Core_Expiration__c, ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                    Trainer_ASM_Grace_Lapse_Date__c, Trainer_SAC_Grace_Lapse_Date__c, 
                    Trainer_SCF_Grace_Lapse_Date__c, Trainer_Core_Expiration_in_Grace__c
                FROM Contact 
                WHERE AccountId IN :listOfAccountIds
                AND Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
            ];
            
            return listOfTrainers;
        } catch (Exception ex) {
            throw new tcTrainingException('Error occurred while retrieving trainers: ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
    }
    public static List<Contact> getListOfSpecialists(List<String> selectedOrgId, List<String> excludedOrgOrContactIdList){
        if(!selectedOrgId.isEmpty())
            return [Select Id, Name, Account.Name, Email, Department, Type__C 
                    from Contact 
                    where AccountId IN :selectedOrgId AND Id NOT IN :excludedOrgOrContactIdList  AND Inactive__c = False ORDER BY Name];
        else return null;
    }
    private static List<InvalidData> createInvalidDataList(String message) {
        List<InvalidData> invalidDataList = new List<InvalidData>();
        InvalidData invalidData = new InvalidData();
        invalidData.message = message;
        invalidDataList.add(invalidData);
        return invalidDataList;
    }
    public static List<Account> getListOfSites(Contact currentContact) {
        // Initialize variables
        List<Account> sitesList = new List<Account>();
        List<Id> siteIds = new List<Id>();
        
        try {
            // Fetch initial account for the contact
            sitesList = [
                SELECT Id, Name, BillingStreet, BillingCity, BillingState, ParentId, Parent.Name,
                       (SELECT Id, Name, Type__c 
                        FROM Contacts 
                        WHERE Certification_Contact_Status__c IN ('Trainer - Certified', 'Trainer - In Grace Period'))
                FROM Account
                WHERE Id = :currentContact.AccountId
            ];
            
            // Collect initial site IDs
            for (Account site : sitesList) {
                if (site.Id != null) {
                    siteIds.add(site.Id);
                }
            }
            
            // Recursively fetch child sites
            while (!siteIds.isEmpty()) {
                List<Account> childSites = [
                    SELECT Id, Name, BillingStreet, BillingCity, BillingState, ParentId, Parent.Name,
                           (SELECT Id, Name, Type__c 
                            FROM Contacts 
                            WHERE Certification_Contact_Status__c IN ('Trainer - Certified', 'Trainer - In Grace Period'))
                    FROM Account
                    WHERE ParentId IN :siteIds
                ];
                
                if (!childSites.isEmpty()) {
                    sitesList.addAll(childSites);
                    
                    // Prepare site IDs for next iteration
                    siteIds = new List<Id>();
                    for (Account site : childSites) {
                        if (site.Id != null) {
                            siteIds.add(site.Id);
                        }
                    }
                } else {
                    siteIds.clear(); // Exit loop if no more child sites
                }
            }
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return sitesList;
    }
    public static List<Account> getListOfSites(String orgId) {
        // Initialize variables
        List<Account> sitesList = new List<Account>();
        List<Id> siteIds = new List<Id>();
        
        try {
            // Fetch initial accounts with the given ParentId
            sitesList = [
                SELECT Id, Name, BillingStreet, BillingCity, BillingState, ParentId, Parent.Name
                FROM Account
                WHERE ParentId = :orgId
            ];
            
            // Collect initial site IDs
            for (Account site : sitesList) {
                if (site.Id != null) {
                    siteIds.add(site.Id);
                }
            }
            
            // Recursively fetch child sites
            while (!siteIds.isEmpty()) {
                List<Account> childSites = [
                    SELECT Id, Name, BillingStreet, BillingCity, BillingState, ParentId, Parent.Name,
                           (SELECT Id, Name, Type__c 
                            FROM Contacts 
                            WHERE Certification_Contact_Status__c IN ('Trainer - Certified', 'Trainer - In Grace Period'))
                    FROM Account
                    WHERE ParentId IN :siteIds
                ];
                
                if (!childSites.isEmpty()) {
                    sitesList.addAll(childSites);
                    
                    // Prepare site IDs for next iteration
                    siteIds = new List<Id>();
                    for (Account site : childSites) {
                        if (site.Id != null) {
                            siteIds.add(site.Id);
                        }
                    }
                } else {
                    siteIds.clear(); // Exit loop if no more child sites
                }
            }
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return sitesList;
    }
    public static Map<Id, List<String>> getCertifiedTrainerCourseMap(List<String> listOfTrainersIds, String endDateString) {
        List<Contact> listOfTrainers = [SELECT Id, Name, FirstName, LastName, Certification_Contact_Status__c, Type__c, Trainer_Course_Core_Expiration__c, ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                          Trainer_ASM_Grace_Lapse_Date__c, Trainer_SAC_Grace_Lapse_Date__c, Trainer_SCF_Grace_Lapse_Date__c, Trainer_Core_Expiration_in_Grace__c
                          FROM Contact 
						  WHERE Id In :listOfTrainersIds];
        
        Map<Id, List<String>> trainerIDtoCertifiedCourseMap = getTrainerIDtoCertifiedCourseMap(listOfTrainers, endDateString);
        
        return trainerIDtoCertifiedCourseMap;
    }
    public static TrainingWrapper getListOfSpecialistsFromCollaboratingAccounts(List<String> selectedTrainerList, String organizationId, String selectedType, List<String> listOfCollabAccountIds, List<String> listOfThirdPartyAccountIds, String currentContactId, String startDate) {
        // Initialize variables
        TrainingWrapper trainingWrapper = new TrainingWrapper();
        List<Contact> specialists = new List<Contact>();
        List<String> accountIdsForSpecialists = new List<String>();
        List<String> excludedIds = new List<String>();
        Date trainingStartDate = Date.valueOf(startDate);
        
        try {
            // Set up excluded IDs
            excludedIds.addAll(selectedTrainerList);
            excludedIds.add(currentContactId);
            
            // Initialize account IDs with organization ID
            accountIdsForSpecialists.add(organizationId);
            
            // Process based on selected type
            if (selectedType.equals('Collaborative')) {
                // Fetch collaborative training agreements
                List<Training_Agreement__c> trainingAgreements = [
                    SELECT Id, Agreement_Type__c, Expiration_Date__c, Legacy_Id__c, 
                           Number_of_Specialist_Allowed__c, Providing_Organization__c,
                           REF_Reciprocal_Record_Created__c, Receiving_Organization__c, 
                           Start_Date__c, Active__c
                    FROM Training_Agreement__c
                    WHERE Providing_Organization__c = :organizationId
                    AND Expiration_Date__c >= :trainingStartDate
                    AND Start_Date__c <= :trainingStartDate
                    AND Agreement_Type__c = 'Collaborative'
                ];
                
                // Add receiving organization IDs from training agreements
                for (Training_Agreement__c agreement : trainingAgreements) {
                    if (!String.isBlank(agreement.Receiving_Organization__c)) {
                        accountIdsForSpecialists.add(agreement.Receiving_Organization__c);
                    }
                }
                
                // Add collaborative account IDs
                accountIdsForSpecialists.addAll(listOfCollabAccountIds);
                
            } else if (selectedType.equals('Third Party')) {
                // Add third-party account IDs
                accountIdsForSpecialists.addAll(listOfThirdPartyAccountIds);
                
            } else if (selectedType.equals('None')) {
                // No additional account IDs needed for 'None' type
            }
            
            // Fetch sites and add their IDs
            List<Account> sitesList = getListOfSites(organizationId);
            for (Account site : sitesList) {
                accountIdsForSpecialists.add(site.Id);
            }
            
            // Fetch specialists and remove duplicates
            specialists.addAll(getListOfSpecialists(accountIdsForSpecialists, excludedIds));
            specialists = new List<Contact>(new Set<Contact>(specialists));
            
            // Set wrapper properties
            trainingWrapper.listOfSpecialists = specialists;
            trainingWrapper.childOrganizations = [
                SELECT Id, Name 
                FROM Account 
                WHERE Id IN :accountIdsForSpecialists
            ];
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return trainingWrapper;
    }

    ///////////// UNUSED METHODS /////////////
    public static List<Contact> getListOfSpecialistsQL(List<String> selectedOrgId, List<String> excludedOrgOrContactIdList){
        
        if(!selectedOrgId.isEmpty()){
            List<Contact> contacts = new List<Contact>();
            String query = 'Select Id, Name, Account.Name, Email, Department, Type__C from Contact '+
                'where ( Type__C = \'Specialist\' OR Type__C = \'Expired Specialist\' OR Type__C = \'Trainer\' OR Type__C = \'Expired Trainer\') AND AccountId IN :selectedOrgId AND Inactive__c = false AND Id NOT IN :excludedOrgOrContactIdList ORDER BY Name';
            
            Database.QueryLocator q = Database.getQueryLocator(query);
            Database.QueryLocatorIterator it =  q.iterator();
            while (it.hasNext()) {
                Contact con = (Contact)it.next();
                contacts.add(con);
            }
            return contacts;
        }else{
            return null;
        }
    }
    public static List<Account> getListOfOrgs(Id organizationId, List<Id> trainersList) {
        List<Account> allChildAccounts = new List<Account>();
        List<Id> currentOrgIds = new List<Id>{organizationId};
        
        try {
            // Recursively fetch all child accounts
            while (!currentOrgIds.isEmpty()) {
                List<Account> childAccounts = [
                    SELECT Id, Name, BillingCity, BillingState 
                    FROM Account 
                    WHERE ParentId IN :currentOrgIds
                ];
                currentOrgIds = new List<Id>();
                for (Account acc : childAccounts) {
                    currentOrgIds.add(acc.Id);
                }
                allChildAccounts.addAll(childAccounts);
            }
            
            // Add the parent organization
            allChildAccounts.addAll([
                SELECT Id, Name, BillingCity, BillingState 
                FROM Account 
                WHERE Id = :organizationId
            ]);
            
            // Remove duplicates using a Set
            Set<Account> uniqueAccounts = new Set<Account>(allChildAccounts);
            return new List<Account>(uniqueAccounts);
        } catch (Exception ex) {
            throw new tcTrainingException('Error occurred while retrieving organizations: ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
    }
    public static TrainingWrapper setOrganizationsSpecialistsNTrainer( List<String> selectedTrainerList, String selectedType, List<Id> listOfCollabAccountIds, List<Id> listOfThirdPartyAccountIds, String selectedOrgId, String currentContactId, String endDateString ) {
        // Initialize variables
        TrainingWrapper trainingWrapper = new TrainingWrapper();
        Contact currentContact;
        List<Contact> trainers = new List<Contact>();
        List<Contact> specialists = new List<Contact>();
        List<Account> sitesList = new List<Account>();
        List<Account> orgListForNewSpecialist = new List<Account>();
        List<String> accountIds = new List<String>();
        
        try {
            // Fetch current contact details
            currentContact = [
                SELECT Id, AccountId, Account.Name, Type__c 
                FROM Contact 
                WHERE Id = :currentContactId
            ];
            sitesList = getListOfSites(currentContact);
            
            // Common account ID setup
            accountIds.add(selectedOrgId);
            for (Account site : sitesList) {
                accountIds.add(site.Id);
            }
            
            // Process based on selected type
            if (selectedType.equals('None')) {
                trainers = getListOfTrainers(selectedOrgId, currentContactId);
                specialists.addAll(getListOfSpecialists(accountIds, new List<String>()));
                orgListForNewSpecialist.addAll([
                    SELECT Id, Name 
                    FROM Account 
                    WHERE Id IN :accountIds
                ]);
            } else if (selectedType.equals('Collaborative')) {
                trainers = getListOfTrainers(selectedOrgId, currentContactId);
                trainers.addAll([
                    SELECT Id, Name, FirstName, LastName, Type__c, 
                           Certification_Contact_Status__c, 
                           Trainer_Course_Core_Expiration__c, 
                           ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                           Trainer_ASM_Grace_Lapse_Date__c, 
                           Trainer_SAC_Grace_Lapse_Date__c, 
                           Trainer_SCF_Grace_Lapse_Date__c, 
                           Trainer_Core_Expiration_in_Grace__c
                    FROM Contact
                    WHERE AccountId IN :listOfCollabAccountIds 
                    AND Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
                    AND Id != :currentContactId
                ]);
                
                // Remove duplicates from trainers
                trainers = new List<Contact>(new Set<Contact>(trainers));
                
                // Fetch specialists
                specialists.addAll(getListOfSpecialists(accountIds, new List<String>()));
                specialists.addAll([
                    SELECT Id, Name, Account.Name, Email, Department, Type__c
                    FROM Contact
                    WHERE AccountId IN :listOfCollabAccountIds 
                    OR Account.ParentId IN :listOfCollabAccountIds
                    ORDER BY Name
                ]);
                
                // Prepare organization list
                orgListForNewSpecialist.addAll(sitesList);
                orgListForNewSpecialist.addAll([
                    SELECT Id, Name 
                    FROM Account 
                    WHERE Id = :selectedOrgId 
                    OR Id IN :listOfCollabAccountIds
                ]);
                orgListForNewSpecialist.sort();
            } else if (selectedType.equals('Third Party')) {
                trainers = getListOfTrainers(selectedOrgId, currentContactId);
                trainers.addAll([
                    SELECT Id, Name, FirstName, LastName, Type__c, 
                           Certification_Contact_Status__c, 
                           Trainer_Course_Core_Expiration__c, 
                           ASM_Exp_Date__c, SAC_Exp_Date__c, SCF_Exp_Date__c,
                           Trainer_ASM_Grace_Lapse_Date__c, 
                           Trainer_SAC_Grace_Lapse_Date__c, 
                           Trainer_SCF_Grace_Lapse_Date__c, 
                           Trainer_Core_Expiration_in_Grace__c
                    FROM Contact
                    WHERE AccountId IN :listOfThirdPartyAccountIds
                    AND Certification_Contact_Status__c IN ('Master Trainer', 'Trainer - Certified', 'Trainer - In Grace Period')
                    AND Id != :currentContactId
                ]);
                
                // Remove duplicates from trainers
                trainers = new List<Contact>(new Set<Contact>(trainers));
                
                // Add third party account IDs
                accountIds.addAll(listOfThirdPartyAccountIds);
                
                // Fetch specialists
                specialists.addAll(getListOfSpecialists(accountIds, new List<String>()));
                specialists.addAll([
                    SELECT Id, Name, Account.Name, Email, Department, Type__c
                    FROM Contact
                    WHERE Account.ParentId IN :listOfThirdPartyAccountIds
                    ORDER BY Name
                ]);
                
                // Prepare organization list
                orgListForNewSpecialist.addAll([
                    SELECT Id, Name 
                    FROM Account 
                    WHERE Id IN :accountIds
                ]);
            }
            
            // Set wrapper properties
            trainingWrapper.trainerIDtoCertifiedCourseMap = getTrainerIDtoCertifiedCourseMap(trainers, endDateString);
            trainingWrapper.listOfTrainers = trainers;
            trainingWrapper.listOfSpecialists = specialists;
            trainingWrapper.childOrganizations = orgListForNewSpecialist;
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return trainingWrapper;
    }
    public static List<Contact> getListOfSpecialistAdmin(String selectedOrgId) {
        // Initialize variables
        List<Contact> specialists = new List<Contact>();
        List<String> accountIds = new List<String>();
        
        try {
            // Add the selected organization ID
            accountIds.add(selectedOrgId);
            
            // Fetch sites and add their IDs
            List<Account> sites = getListOfSites(selectedOrgId);
            for (Account site : sites) {
                accountIds.add(site.Id);
            }
            
            // Fetch specialists
            specialists.addAll(getListOfSpecialists(accountIds, new List<String>()));
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return specialists;
    }
    public static TrainingWrapper checkCollabNThirdPartyController(String selectedOrgId, String startDate) {
        // Initialize variables
        TrainingWrapper trainingWrapper = new TrainingWrapper();
        trainingWrapper.listOfCollabAccountIds = new List<Id>();
        trainingWrapper.listOfThirdPartyAccountIds = new List<Id>();
        Date trainingStartDate = Date.valueOf(startDate);
        
        try {
            // Fetch training agreements
            List<Training_Agreement__c> trainingAgreements = [
                SELECT Id, Agreement_Type__c, Expiration_Date__c, Legacy_Id__c, 
                       Number_of_Specialist_Allowed__c, Providing_Organization__c,
                       REF_Reciprocal_Record_Created__c, Receiving_Organization__c, 
                       Start_Date__c, Active__c
                FROM Training_Agreement__c
                WHERE Providing_Organization__c = :selectedOrgId
                AND Expiration_Date__c >= :trainingStartDate
                AND Start_Date__c <= :trainingStartDate
                AND Agreement_Type__c != '' 
                AND Agreement_Type__c != null
            ];
            
            // Process training agreements
            Set<Id> childOrgIds = new Set<Id>();
            for (Training_Agreement__c agreement : trainingAgreements) {
                if (agreement.Agreement_Type__c == 'Collaborative') {
                    trainingWrapper.listOfCollabAccountIds.add(agreement.Receiving_Organization__c);
                    childOrgIds.add(agreement.Receiving_Organization__c);
                    trainingWrapper.noOfSplallowed = Integer.valueOf(agreement.Number_of_Specialist_Allowed__c);
                } else {
                    trainingWrapper.listOfThirdPartyAccountIds.add(agreement.Receiving_Organization__c);
                    childOrgIds.add(agreement.Receiving_Organization__c);
                    trainingWrapper.noOfSplallowed = Integer.valueOf(agreement.Number_of_Specialist_Allowed__c);
                }
            }
            
            // Fetch child organizations and add their IDs
            if (!childOrgIds.isEmpty()) {
                List<Account> childOrgs = [
                    SELECT Id, Name, ParentId 
                    FROM Account 
                    WHERE ParentId IN :childOrgIds
                ];
                for (Account account : childOrgs) {
                    trainingWrapper.listOfCollabAccountIds.add(account.Id);
                }
            }
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return trainingWrapper;
    }
    public static CollabAndThirdPartyAccountsWrapper getCollabAndThirdPartyAccounts(String accountId, String startDate) {
        // Initialize variables
        CollabAndThirdPartyAccountsWrapper wrapper = new CollabAndThirdPartyAccountsWrapper();
        wrapper.listOfThirdPartyAccountIds = new List<String>();
        wrapper.listOfCollabAccountIds = new List<String>();
        Date trainingStartDate = Date.valueOf(startDate);
        
        try {
            // Fetch training agreements
            List<Training_Agreement__c> trainingAgreements = [
                SELECT Id, Agreement_Type__c, Expiration_Date__c, Legacy_Id__c, 
                       Number_of_Specialist_Allowed__c, Providing_Organization__c,
                       Receiving_Organization__c, Start_Date__c, Active__c
                FROM Training_Agreement__c
                WHERE Providing_Organization__c = :accountId
                AND Expiration_Date__c >= :trainingStartDate
                AND Start_Date__c <= :trainingStartDate
            ];
            
            // Process training agreements
            for (Training_Agreement__c agreement : trainingAgreements) {
                if (agreement.Agreement_Type__c == 'Third Party') {
                    wrapper.listOfThirdPartyAccountIds.add(agreement.Receiving_Organization__c);
                } else if (agreement.Agreement_Type__c == 'Collaborative') {
                    wrapper.listOfCollabAccountIds.add(agreement.Receiving_Organization__c);
                }
            }
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return wrapper;
    }
    public static Boolean countCollabAndThirdPartySpecialists( List<Contact> specialistsList, String authorizationType, String providingOrgId, String receivingOrgId, String trainingStartDateStr, String trainingId) {
        // Initialize variables
        Boolean isAllowed = true;
        Map<String, Integer> orgIdToSelectedSpecialists = new Map<String, Integer>();
        Map<String, Integer> orgIdToExistingSpecialists = new Map<String, Integer>();
        Set<String> specialistIds = new Set<String>();
        Date trainingStartDate = Date.valueOf(trainingStartDateStr);
        
        try {
            // Count selected specialists by account
            if (!specialistsList.isEmpty()) {
                for (Contact contact : specialistsList) {
                    if (!specialistIds.contains(contact.Id)) {
                        specialistIds.add(contact.Id);
                        if (orgIdToSelectedSpecialists.containsKey(contact.AccountId)) {
                            orgIdToSelectedSpecialists.put(
                                contact.AccountId,
                            orgIdToSelectedSpecialists.get(contact.AccountId) + 1
                                );
                        } else {
                            orgIdToSelectedSpecialists.put(contact.AccountId, 1);
                        }
                    }
                }
            }
            
            // Fetch training agreements
            List<Training_Agreement__c> trainingAgreements = [
                SELECT Id, Agreement_Type__c, Expiration_Date__c, Legacy_Id__c, 
                       Number_of_Specialist_Allowed__c, Providing_Organization__c,
                       Receiving_Organization__c, Start_Date__c, Active__c
                FROM Training_Agreement__c
                WHERE Providing_Organization__c = :providingOrgId
                AND Receiving_Organization__c = :receivingOrgId
                AND Expiration_Date__c >= :trainingStartDate
                AND Start_Date__c <= :trainingStartDate
                LIMIT 1
            ];
            
            if (!trainingAgreements.isEmpty()) {
                // Fetch finalized trainings within agreement date range
                List<hed__Course_Offering__c> trainings = [
                    SELECT Id, cc_Course_Start_Date__c, cc_Course_End_Date__c, 
                           Training_Authorization__c, Finalized__c,
                           (SELECT Id, Registration_Contact__c, Registration_Contact__r.AccountId 
                            FROM Registers__r)
                    FROM hed__Course_Offering__c
                    WHERE cc_Course_Start_Date__c >= :trainingAgreements[0].Start_Date__c
                    AND cc_Course_Start_Date__c <= :trainingAgreements[0].Expiration_Date__c
                    AND Training_Authorization__c = :authorizationType
                    AND Finalized__c = true
                    AND Id != :trainingId
                    ];
                
                // Count existing specialists in trainings
                for (hed__Course_Offering__c training : trainings) {
                    specialistIds = new Set<String>();
                    if (!training.Registers__r.isEmpty()) {
                        for (cc_Register__c registration : training.Registers__r) {
                            if (!specialistIds.contains(registration.Registration_Contact__c)) {
                                specialistIds.add(registration.Registration_Contact__c);
                                if (orgIdToExistingSpecialists.containsKey(registration.Registration_Contact__r.AccountId)) {
                                    orgIdToExistingSpecialists.put(
                                        registration.Registration_Contact__r.AccountId,
                                    orgIdToExistingSpecialists.get(registration.Registration_Contact__r.AccountId) + 1
                                        );
                                } else {
                                    orgIdToExistingSpecialists.put(registration.Registration_Contact__r.AccountId, 1);
                                }
                            }
                        }
                    }
                }
                
                // Check if specialist limit is exceeded
                Integer existingCount = orgIdToExistingSpecialists.containsKey(receivingOrgId)
                    ? orgIdToExistingSpecialists.get(receivingOrgId)
                    : 0;
                Integer selectedCount = orgIdToSelectedSpecialists.containsKey(receivingOrgId)
                    ? orgIdToSelectedSpecialists.get(receivingOrgId)
                    : 0;
                Integer totalSpecialists = existingCount + selectedCount + 1; // +1 for the new specialist
                Integer allowedSpecialists = Integer.valueOf(trainingAgreements[0].Number_of_Specialist_Allowed__c);
                
                isAllowed = totalSpecialists <= allowedSpecialists;
            } else {
                // If no agreements exist, check selected specialists against the limit
                Integer selectedCount = orgIdToSelectedSpecialists.containsKey(receivingOrgId)
                    ? orgIdToSelectedSpecialists.get(receivingOrgId)
                    : 0;
                isAllowed = (selectedCount + 1) <= trainingAgreements[0].Number_of_Specialist_Allowed__c;
            }
            
        } catch (Exception ex) {
            throw new tcTrainingException('Error : ' + ex.getMessage() + '\n' + ex.getStackTraceString());
        }
        
        return isAllowed;
    }
    public static InvalidOrganizationsWrapper validateCollabAndThirdPartySpecialistsOnSave( String providerOrgId, List<Contact> selectedSpecialists, String trainingStartDateStr, String trainingId, String authorizationType ) {
        InvalidOrganizationsWrapper result = new InvalidOrganizationsWrapper();
        result.invalidReceivingOrgList = new List<String>();
        result.specialistCountExceedingOrgList = new List<String>();
        result.isValid = true;
        result.childAccountIdList = new List<String>();
        result.selectedAccountIdList = new List<String>();
        
        Date trainingStartDate = Date.valueOf(trainingStartDateStr);
        Set<String> allAccountIds = new Set<String>{providerOrgId};
        Set<String> selectedReceivingOrgIds = new Set<String>();
        Set<String> validReceivingOrgIds = new Set<String>();
        Set<String> rejectedOrgIds = new Set<String>();
        Map<String, Training_Agreement__c> orgIdToAgreementMap = new Map<String, Training_Agreement__c>();
        Map<String, Integer> selectedSpecialistCountByOrg = new Map<String, Integer>();
        Map<String, Integer> existingSpecialistsByOrg = new Map<String, Integer>();
        Map<String, String> orgIdToOrgNameMap = new Map<String, String>();
        List<Date> startDates = new List<Date>();
        List<Date> expiryDates = new List<Date>();
        Date minStartDate;
        Date maxExpiryDate;
        
        try {
            // Collect child accounts
            List<Account> indoctrinatedAccounts = getListOfSites(providerOrgId);
            for (Account childOrg : indoctrinatedAccounts) {
                allAccountIds.add(childOrg.Id);
            }
            result.childAccountIdList.addAll(allAccountIds);
            
            // Collect selected receiving organizations
            List<String> selectedAccountIds = new List<String>();
            for (Contact specialist : selectedSpecialists) {
                selectedAccountIds.add(specialist.AccountId);
                if (!allAccountIds.contains(specialist.AccountId)) {
                    selectedReceivingOrgIds.add(specialist.AccountId);
                }
            }
            result.selectedAccountIdList.addAll(selectedAccountIds);
            
            // Query training agreements
            List<Training_Agreement__c> trainingAgreements = [
                SELECT Id, Agreement_Type__c, Expiration_Date__c, Legacy_Id__c, 
                       Number_of_Specialist_Allowed__c, Providing_Organization__c,
                       REF_Reciprocal_Record_Created__c, Receiving_Organization__c, 
                       Start_Date__c, Active__c, Receiving_Organization__r.Name
                FROM Training_Agreement__c
                WHERE Providing_Organization__c = :providerOrgId
                AND Expiration_Date__c >= :trainingStartDate
                AND Start_Date__c <= :trainingStartDate
                AND Receiving_Organization__c IN :selectedReceivingOrgIds
            ];
            
            // Process training agreements
            for (Training_Agreement__c agreement : trainingAgreements) {
                validReceivingOrgIds.add(agreement.Receiving_Organization__c);
                startDates.add(agreement.Start_Date__c);
                expiryDates.add(agreement.Expiration_Date__c);
                orgIdToAgreementMap.put(agreement.Receiving_Organization__c, agreement);
                orgIdToOrgNameMap.put(agreement.Receiving_Organization__c, agreement.Receiving_Organization__r.Name);
            }
            
            if (!startDates.isEmpty()) {
                startDates.sort();
                expiryDates.sort();
                minStartDate = startDates[0];
                maxExpiryDate = expiryDates[expiryDates.size() - 1];
            }
            
            // Include child accounts of collaborator organizations
            Set<String> collaboratorOrgIds = new Set<String>();
            for (Training_Agreement__c agreement : [
                SELECT Receiving_Organization__c
                FROM Training_Agreement__c
                WHERE Providing_Organization__c = :providerOrgId
                AND Expiration_Date__c >= :trainingStartDate
                AND Start_Date__c <= :trainingStartDate
            ]) {
                collaboratorOrgIds.add(agreement.Receiving_Organization__c);
            }
            
            for (Account acc : [SELECT Id FROM Account WHERE ParentId IN :collaboratorOrgIds]) {
                validReceivingOrgIds.add(acc.Id);
                allAccountIds.add(acc.Id);
            }
            
            // Validate selected specialists and count by organization
            for (Contact specialist : selectedSpecialists) {
                String accountId = specialist.AccountId;
                if (!validReceivingOrgIds.contains(accountId) && !allAccountIds.contains(accountId) && !rejectedOrgIds.contains(accountId)) {
                    rejectedOrgIds.add(accountId);
                } else if (validReceivingOrgIds.contains(accountId)) {
                    Integer currentCount = selectedSpecialistCountByOrg.containsKey(accountId) ? selectedSpecialistCountByOrg.get(accountId) : 0;
                    selectedSpecialistCountByOrg.put(accountId, currentCount + 1);
                }
            }
            
            for (Account acc : [SELECT Id, Name FROM Account WHERE Id IN :rejectedOrgIds]) {
                result.invalidReceivingOrgList.add(acc.Name);
            }
            
            // Query existing trainings
            List<hed__Course_offering__c> trainings = [
                SELECT Id, cc_Course_Start_Date__c, cc_Course_End_Date__c, Training_Authorization__c, Finalized__c,
                       (SELECT Id, Name, hed__Contact__r.AccountId FROM hed__Term_Grades__r),
                       (SELECT Course_Offering__c, Id, Name, Registration_Holding__c, Registration_Contact__c,
                               Registration_Contact__r.Email, Registration_Contact__r.AccountId, Registration_Contact__r.isEmailBounced
                        FROM Registers__r)
                FROM hed__Course_offering__c
                WHERE cc_Course_Start_Date__c >= :minStartDate
                AND cc_Course_Start_Date__c <= :maxExpiryDate
                AND Finalized__c = true
                AND Organization__c = :providerOrgId
                AND Training_Authorization__c = :authorizationType
                AND Id != :trainingId
            ];
            
            // Count existing specialists
            for (hed__Course_offering__c training : trainings) {
                Set<String> specialistIds = new Set<String>();
                Date startDate = training.cc_Course_Start_Date__c;
                
                for (Training_Agreement__c agreement : trainingAgreements) {
                    if (startDate >= agreement.Start_Date__c && startDate <= agreement.Expiration_Date__c) {
                        for (cc_Register__c reg : training.Registers__r) {
                            if (!specialistIds.contains(reg.Registration_Contact__c)) {
                                specialistIds.add(reg.Registration_Contact__c);
                                String accountId = reg.Registration_Contact__r.AccountId;
                                Integer currentCount = existingSpecialistsByOrg.containsKey(accountId) ? existingSpecialistsByOrg.get(accountId) : 0;
                                existingSpecialistsByOrg.put(accountId, currentCount + 1);
                            }
                        }
                    }
                }
            }
            
            // Validate specialist counts against agreement limits
            for (String orgId : selectedSpecialistCountByOrg.keySet()) {
                Integer selectedCount = selectedSpecialistCountByOrg.containsKey(orgId) ? selectedSpecialistCountByOrg.get(orgId) : 0;
                Integer existingCount = existingSpecialistsByOrg.containsKey(orgId) ? existingSpecialistsByOrg.get(orgId) : 0;
                Integer totalCount = selectedCount + existingCount;
                Decimal allowedCount = orgIdToAgreementMap.containsKey(orgId) ? orgIdToAgreementMap.get(orgId).Number_of_Specialist_Allowed__c : null;
                
                if (allowedCount != null && totalCount > allowedCount) {
                    result.specialistCountExceedingOrgList.add(orgIdToOrgNameMap.get(orgId));
                }
            }
            
            // Set validation status
            result.isValid = result.invalidReceivingOrgList.isEmpty() && result.specialistCountExceedingOrgList.isEmpty();
            
        } catch (Exception ex) {
            throw new tcTrainingException('Failed Validating Org: ' + ex.getMessage() + '/n' + ex.getStackTraceString());
        }
        
        return result;
    }
}