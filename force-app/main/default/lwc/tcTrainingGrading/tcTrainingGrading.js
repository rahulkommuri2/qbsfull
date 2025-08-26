import { LightningElement, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { CurrentPageReference } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import formFactorPropertyName from "@salesforce/client/formFactor";
import initializePage from "@salesforce/apex/tcTrainingGradingController.initializePage";
import saveAndFinalizeGrade from "@salesforce/apex/tcTrainingGradingController.saveAndFinalizeGrade";
import generateCertificate from "@salesforce/apex/tcTrainingGradingController.generateCertificate";
import emailCertificate from "@salesforce/apex/tcTrainingGradingController.emailCertificate";

export default class TcTrainingGrading extends NavigationMixin(
  LightningElement
) {
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
  @track columns = [];

  // Define statuses for grade cycling with SLDS classes
  statuses = [
    { label: "NC", class: "slds-button_neutral", value: "NC" },
    { label: "NP", class: "slds-button_destructive", value: "NP" },
    { label: "NA", class: "slds-button_outline-brand", value: "NA" },
    { label: "P", class: "slds-button_success", value: "P" },
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
        console.error(
          "Missing trainingId or contactId in page reference:",
          currentPageReference.state
        );
      }
    }
  }

  // Helper method to get SLDS class for grade
  getSldsButtonVariant(grade) {
    switch (grade) {
      case "NC":
        return "neutral"; // Gray
      case "NP":
        return "destructive"; // Red
      case "NA":
        return "brand"; // Blue
      case "P":
        return "success"; // Green
      default:
        return "neutral";
    }
  }

  loadTrainingDetails() {
    this.isLoading = true;
    initializePage({ trainingId: this.trainingId, conId: this.contactId })
      .then((result) => {
        console.log("Apex response:", result);
        this.trainingDetails = JSON.parse(JSON.stringify(result));
        this.trainingName = this.trainingDetails.name || "Unknown Training";
        this.isFinalized = this.trainingDetails.finalized || false;

        if (this.isFinalized) {
          this.restrictDownload = false;
          this.restrictEmail = false;
        } else {
          this.restrictDownload = true;
          this.restrictEmail = true;
        }

        this.formattedFinalizeDate = this.formatDate(
          this.trainingDetails.finalizeDate
        );
        this.formattedStartDate = this.formatDate(
          this.trainingDetails.startDate
        );
        this.mode = this.trainingDetails.mode || "Initial";

        // Set actual and minimum time based on mode
        if (this.mode === "Initial") {
          this.actualTime = this.trainingDetails.initialTime || 0;
          this.minimumTime = this.trainingDetails.courseInitialTime || 0;
        } else {
          this.actualTime = this.trainingDetails.recertTime || 0;
          this.minimumTime = this.trainingDetails.courseRecertTime || 0;
        }

        this.specialists = this.trainingDetails.specialistList || [];
        this.hasPermissionToReFinalize =
          this.trainingDetails.hasPermissionToReFinalize || false;

        // Set permissions for re-finalization
        if (this.trainingDetails.hasPermissionToReFinalize) {
          this.restrictReFinalize = true;
        } else {
          this.restrictReFinalize = false;
        }

        // Process competencies
        this.competencies = (
          this.trainingDetails.competencyWraperList || []
        ).map((comp) => {
          const specialistGradeStringList = (
            comp.specialistGradeStringList || []
          ).map((grade) => {
            return ["P", "NC", "NP", "NA"].includes(grade) ? grade : "NC";
          });
          const specialistGradeList = specialistGradeStringList.map(
            (grade) => grade === "P"
          );
          return {
            ...comp,
            specialistGradeStringList,
            specialistGradeList,
          };
        });

        // Initialize columns
        this.initializeColumns();
        // Prepare table data
        this.prepareTableData();

        if (!this.competencies.length || !this.specialists.length) {
          this.dispatchEvent(
            new ShowToastEvent({
              title: "Warning",
              message:
                "No competencies or specialists found for this training.",
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

  initializeColumns() {
    // Start with the competency name column
    this.columns = [
      { label: "Competency", fieldName: "name", type: "text", editable: false },
    ];

    // Add a column for each specialist
    this.specialists.forEach((specialist) => {
      this.columns.push({
        label: specialist.name,
        type: "button",
        typeAttributes: {
          label: { fieldName: `${specialist.id}_grade` },
          variant: { fieldName: `${specialist.id}_variant` },
          name: specialist.id,
        },
      });
    });
  }

  prepareTableData() {
    this.tableData = this.competencies.map(comp => {
        const row = {
            id: comp.id,
            name: comp.name,
            gradeButtons: [] // Array of grade button objects
        };
        
        // Create grade buttons array
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


  handleRowAction(event) {
    console.log("Button clicked!", event.detail); // Debug log

    const action = event.detail.action;
    const row = event.detail.row;

    // Get specialist ID from action name
    const specialistId = action.name;
    if (!specialistId) {
      console.error("No specialist ID found in action.name");
      return;
    }

    // Find competency index
    const compIndex = this.competencies.findIndex((c) => c.id === row.id);
    if (compIndex === -1) {
      console.error("Competency not found");
      return;
    }

    // Find specialist index
    const specIndex = this.specialists.findIndex((s) => s.id === specialistId);
    if (specIndex === -1) {
      console.error("Specialist not found");
      return;
    }

    // Get current grade and cycle to next
    const currentGrade =
      this.competencies[compIndex].specialistGradeStringList[specIndex];
    const currentIndex = this.statuses.findIndex(
      (status) => status.value === currentGrade
    );
    const nextIndex = (currentIndex + 1) % this.statuses.length;
    const nextStatus = this.statuses[nextIndex];

    console.log(`Cycling from ${currentGrade} to ${nextStatus.value}`); // Debug log

    // Update competency data
    this.competencies[compIndex].specialistGradeStringList[specIndex] =
      nextStatus.value;
    this.competencies[compIndex].specialistGradeList[specIndex] =
      nextStatus.value === "P";

    // Update table data for immediate UI refresh
    this.tableData[compIndex][`${specialistId}_grade`] = nextStatus.value;
    this.tableData[compIndex][`${specialistId}_variant`] =
      this.getSldsButtonVariant(nextStatus.value);
    this.tableData = [...this.tableData];

    console.log("Table data updated:", this.tableData[compIndex]); // Debug log
  }

  // Add this method to handle grade button clicks
  handleGradeClick(event) {
    // Get competency row id and specialist id from data attributes
    const rowId = event.currentTarget.dataset.rowId;
    const specialistId = event.currentTarget.dataset.specialistId;

    // Find the competency index
    const compIndex = this.tableData.findIndex(row => row.id === rowId);
    if (compIndex === -1) return;

    // Find the specialist index
    const specIndex = this.specialists.findIndex(s => s.id === specialistId);
    if (specIndex === -1) return;

    // Get current grade
    const currentGrade = this.tableData[compIndex].gradeButtons[specIndex].grade;
    const currentStatusIndex = this.statuses.findIndex(s => s.label === currentGrade);

    // Cycle to next grade
    const nextStatusIndex = (currentStatusIndex + 1) % this.statuses.length;
    const nextStatus = this.statuses[nextStatusIndex];

    // Update grade in tableData
    this.tableData[compIndex].gradeButtons[specIndex].grade = nextStatus.label;
    this.tableData[compIndex].gradeButtons[specIndex].cssClass = `status-btn ${nextStatus.label}`;

    // Also update in competencies (so it will be sent to backend)
    this.competencies[compIndex].specialistGradeStringList[specIndex] = nextStatus.label;
    this.competencies[compIndex].specialistGradeList[specIndex] = (nextStatus.label === "P");

    // Force UI refresh
    this.tableData = [...this.tableData];
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
      state: {
        trainingId: this.trainingId,
        contactId: this.contactId,
      },
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuVisible = !this.isMobileMenuVisible;
    this.mobileMenuIcon = this.isMobileMenuVisible
      ? "utility:up"
      : "utility:down";
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

    // Sync tableData grades to trainingDetails before saving
    this.tableData.forEach((row, compIndex) => {
        row.gradeButtons.forEach((gradeBtn, specIndex) => {
            if (
                this.trainingDetails &&
                this.trainingDetails.competencyWraperList &&
                this.trainingDetails.competencyWraperList[compIndex] &&
                this.trainingDetails.competencyWraperList[compIndex].specialistGradeStringList
            ) {
                this.trainingDetails.competencyWraperList[compIndex].specialistGradeStringList[specIndex] = gradeBtn.grade;
            }
        });
    });

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
              message: "Grades saved successfully",
              variant: "success",
            })
          );
          this.loadTrainingDetails(); // Refresh data
        } else {
          throw new Error("Save failed");
        }
      })
      .catch((error) => {
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
    generateCertificate({ trainingId: this.trainingId })
      .then((result) => {
        console.log("Certificates generated: ", result);
        if (result && result.length > 0) {
          const base64 = result[0].documentBase64;
          const link = document.createElement("a");
          link.href = `data:application/pdf;base64,${base64}`;
          link.download = "certificates.pdf";
          link.click();
        }
      })
      .catch((error) => {
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
    const gradeIds = this.specialists.map((s) => s.regId);
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
        } else {
          throw new Error("Email failed");
        }
      })
      .catch((error) => {
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