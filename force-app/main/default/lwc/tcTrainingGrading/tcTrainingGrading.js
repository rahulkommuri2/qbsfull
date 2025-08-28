import { LightningElement, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { CurrentPageReference } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import formFactorPropertyName from "@salesforce/client/formFactor";
import initializePage from "@salesforce/apex/tcTrainingGradingController.initializePage";
import saveAndFinalizeGrade from "@salesforce/apex/tcTrainingGradingController.saveAndFinalizeGrade";
import generateCertificate from "@salesforce/apex/tcTrainingGradingController.generateCertificate";
import emailCertificate from "@salesforce/apex/tcTrainingGradingController.emailCertificate";

export default class TcTrainingGrading extends NavigationMixin(LightningElement) {
    @track trainingDetails;
    @track specialists = [];
    @track competencies = [];
    @track tableData = [];
    @track actualTime = 0;
    @track minimumTime = 0;
    @track trainingId;
    @track contactId;
    @track trainingName = "";
    @track isFinalized = false;
    @track formattedFinalizeDate = "";
    @track formattedStartDate = "";
    @track mode;
    @track hasPermissionToReFinalize = false;
    @track isLoading = false;
    @track restrictReFinalize = true;
    @track restrictDownload = true;
    @track restrictEmail = true;
    @track isMobileView = false;
    @track isMobileMenuVisible = false;
    @track mobileMenuIcon = "utility:down";

    // Define statuses for grade cycling
    statuses = [
        { label: "P", value: "P" },
        { label: "NC", value: "NC" },
        { label: "NP", value: "NP" },
        { label: "NA", value: "NA" }
    ];

    connectedCallback() {
        this.isMobileView = formFactorPropertyName === "Small";
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.trainingId = currentPageReference.state.trainingId;
            this.contactId = currentPageReference.state.contactId;
            if (this.trainingId && this.contactId) {
                this.loadTrainingDetails();
            } else {
                console.error("Missing trainingId or contactId in page reference:", currentPageReference.state);
            }
        }
    }

    loadTrainingDetails() {
        this.isLoading = true;
        initializePage({ trainingId: this.trainingId, ConId: this.contactId })
            .then((result) => {
                if (!result) {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Error",
                            message: "Training not found or no data available",
                            variant: "error",
                        })
                    );
                    return;
                }

                // Deep clone the result to avoid issues with proxy objects
                this.trainingDetails = JSON.parse(JSON.stringify(result));
                
                // Set basic training information
                this.trainingName = this.trainingDetails.name || "Unknown Training";
                this.isFinalized = this.trainingDetails.finalized || false;
                this.mode = this.trainingDetails.mode || "Initial";
                
                // Set formatted dates
                this.formattedFinalizeDate = this.formatDate(this.trainingDetails.finalizeDate);
                this.formattedStartDate = this.formatDate(this.trainingDetails.startDate);

                // Set actual and minimum time based on mode
                if (this.mode === "Initial") {
                    this.actualTime = this.trainingDetails.initialTime || 0;
                    this.minimumTime = this.trainingDetails.courseInitialTime || 0;
                } else {
                    this.actualTime = this.trainingDetails.recertTime || 0;
                    this.minimumTime = this.trainingDetails.courseRecertTime || 0;
                }

                // Set specialists list
                this.specialists = this.trainingDetails.specialistList || [];

                // Set permissions
                this.hasPermissionToReFinalize = this.trainingDetails.hasPermissionToReFinalize || false;
                
                // Set button restrictions based on finalization status
                if (this.isFinalized) {
                    this.restrictDownload = false;
                    this.restrictEmail = false;
                    this.restrictReFinalize = !this.hasPermissionToReFinalize;
                } else {
                    this.restrictDownload = true;
                    this.restrictEmail = true;
                    this.restrictReFinalize = true;
                }

                // Process competencies and ensure proper grade structure
                this.competencies = (this.trainingDetails.competencyWraperList || []).map((comp) => {
                    // Ensure specialistGradeStringList exists and has proper values
                    const specialistGradeStringList = (comp.specialistGradeStringList || []).map((grade) => {
                        return ["P", "NC", "NP", "NA"].includes(grade) ? grade : "NC";
                    });
                    
                    // Ensure specialistGradeList matches the string list
                    const specialistGradeList = specialistGradeStringList.map(grade => grade === "P");

                    return {
                        ...comp,
                        specialistGradeStringList,
                        specialistGradeList
                    };
                });

                // Prepare table data for UI
                this.prepareTableData();

                if (!this.competencies.length || !this.specialists.length) {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Warning",
                            message: "No competencies or specialists found for this training.",
                            variant: "warning",
                        })
                    );
                }
            })
            .catch((error) => {
                console.error("Error loading training details:", error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error loading data",
                        message: error.body ? error.body.message : error.message,
                        variant: "error",
                    })
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    prepareTableData() {
        this.tableData = this.competencies.map(comp => {
            const row = {
                id: comp.id,
                name: comp.name,
                gradeButtons: []
            };
            
            // Create grade buttons array for each specialist
            this.specialists.forEach((spec, index) => {
                const grade = comp.specialistGradeStringList[index] || 'NC';
                row.gradeButtons.push({
                    specialistId: spec.id,
                    specialistName: spec.name,
                    grade: grade,
                    cssClass: `status-btn ${grade}`
                });
            });
            
            return row;
        });
    }

    formatDate(dateTime) {
        if (!dateTime) return "";
        const date = new Date(dateTime);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    handleBackToTrainings() {
        this[NavigationMixin.Navigate]({
            type: "standard__recordPage",
            attributes: {
                recordId: this.trainingId,
                objectApiName: "hed__Course_Offering__c",
                actionName: "view",
            },
        });
    }

    toggleMobileMenu() {
        this.isMobileMenuVisible = !this.isMobileMenuVisible;
        this.mobileMenuIcon = this.isMobileMenuVisible ? "utility:up" : "utility:down";
    }

    handleGradeClick(event) {
        if (this.isFinalized) return; // Prevent changes if finalized

        // Get competency row id and specialist id from data attributes
        const rowId = event.currentTarget.dataset.rowId;
        const specialistId = event.currentTarget.dataset.specialistId;

        // Find the competency index in tableData
        const tableRowIndex = this.tableData.findIndex(row => row.id === rowId);
        if (tableRowIndex === -1) return;

        // Find the specialist index
        const specIndex = this.specialists.findIndex(s => s.id === specialistId);
        if (specIndex === -1) return;

        // Find the competency index in competencies array
        const compIndex = this.competencies.findIndex(c => c.id === rowId);
        if (compIndex === -1) return;

        // Get current grade
        const currentGrade = this.tableData[tableRowIndex].gradeButtons[specIndex].grade;
        const currentStatusIndex = this.statuses.findIndex(s => s.label === currentGrade);

        // Cycle to next grade
        const nextStatusIndex = (currentStatusIndex + 1) % this.statuses.length;
        const nextStatus = this.statuses[nextStatusIndex];

        // Update grade in tableData for UI
        this.tableData[tableRowIndex].gradeButtons[specIndex].grade = nextStatus.label;
        this.tableData[tableRowIndex].gradeButtons[specIndex].cssClass = `status-btn ${nextStatus.label}`;

        // Update in competencies (backend data structure)
        this.competencies[compIndex].specialistGradeStringList[specIndex] = nextStatus.label;
        this.competencies[compIndex].specialistGradeList[specIndex] = (nextStatus.label === "P");

        // Update the trainingDetails structure that will be sent to Apex
        if (this.trainingDetails.competencyWraperList && this.trainingDetails.competencyWraperList[compIndex]) {
            this.trainingDetails.competencyWraperList[compIndex].specialistGradeStringList[specIndex] = nextStatus.label;
            this.trainingDetails.competencyWraperList[compIndex].specialistGradeList[specIndex] = (nextStatus.label === "P");
        }

        // Force UI refresh
        this.tableData = [...this.tableData];
    }

    handleFinalize() {
        this.handleSave(true, false, false);
    }

    handleReFinalize() {
        const indicate = window.confirm("Indicate to reprint certificates?");
        this.handleSave(false, true, indicate);
    }

    handleSave(isFinalize, isRefinalize, isIndicate) {
        this.isLoading = true;

        // Ensure trainingDetails has the latest competency data
        if (this.trainingDetails && this.trainingDetails.competencyWraperList) {
            this.trainingDetails.competencyWraperList = this.competencies;
        }

        // Log the data being sent to Apex for debugging
        console.log('Data sent to saveAndFinalizeGrade:', {
            trainingDeatailsString: JSON.stringify(this.trainingDetails),
            finalize: isFinalize,
            refinalize: isRefinalize,
            isIndicate: isIndicate,
            conId: this.contactId
        });

        saveAndFinalizeGrade({
            trainingDeatailsString: JSON.stringify(this.trainingDetails),
            finalize: isFinalize,
            refinalize: isRefinalize,
            isIndicate: isIndicate,
            conId: this.contactId,
        })
            .then((result) => {
                if (result) {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Success",
                            message: isFinalize ? "Grades finalized successfully" : "Grades re-finalized successfully",
                            variant: "success",
                        })
                    );
                    // Refresh data to get updated status
                    this.loadTrainingDetails();
                } else {
                    throw new Error("Save operation failed");
                }
            })
            .catch((error) => {
                console.error("Save error:", error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error saving grades",
                        message: error.body ? error.body.message : error.message,
                        variant: "error",
                    })
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleDownloadCertificates() {
        this.isLoading = true;
        generateCertificate({ trainId: this.trainingId })
            .then((result) => {
                if (result && result.length > 0) {
                    const base64 = result[0].documentBase64;
                    const link = document.createElement("a");
                    link.href = `data:application/pdf;base64,${base64}`;
                    link.download = `${this.trainingName}_certificates.pdf`;
                    link.click();
                    
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Success",
                            message: "Certificates downloaded successfully",
                            variant: "success",
                        })
                    );
                } else {
                    throw new Error("No certificates generated");
                }
            })
            .catch((error) => {
                console.error("Download error:", error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error generating certificate",
                        message: error.body ? error.body.message : error.message,
                        variant: "error",
                    })
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleEmailCertificates() {
        const ccEmail = window.prompt("Enter CC email (optional):");
        
        // Get register IDs from specialists - need to get this from the registration data
        const gradeIds = [];
        
        // Extract register IDs from the training details
        if (this.trainingDetails && this.trainingDetails.specialistList) {
            this.trainingDetails.specialistList.forEach(specialist => {
                // The register ID should be available in the specialist data
                // Based on the Apex code, we need to find the register record for each specialist
                if (specialist.regId) {
                    gradeIds.push(specialist.regId);
                } else if (specialist.id) {
                    // If regId is not directly available, we might need to use the specialist ID
                    // This would require modification in the Apex to return register IDs
                    gradeIds.push(specialist.id);
                }
            });
        }

        if (gradeIds.length === 0) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Error",
                    message: "No valid registration records found for emailing certificates",
                    variant: "error",
                })
            );
            return;
        }

        this.isLoading = true;
        emailCertificate({ GradeId: gradeIds, CCEmail: ccEmail || "" })
            .then((result) => {
                if (result === "Success") {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Success",
                            message: "Certificates emailed successfully",
                            variant: "success",
                        })
                    );
                } else if (result.includes("Failed to send")) {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Partial Success",
                            message: result,
                            variant: "warning",
                        })
                    );
                } else {
                    throw new Error(result || "Email operation failed");
                }
            })
            .catch((error) => {
                console.error("Email error:", error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error emailing certificates",
                        message: error.body ? error.body.message : error.message,
                        variant: "error",
                    })
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}