import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Employee, ContractType } from '../../models/employee.model';

@Component({
  selector: 'app-edit-employee-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-employee-modal.component.html',
  styleUrl: './edit-employee-modal.component.scss',
})
export class EditEmployeeModalComponent implements OnInit, OnDestroy {
  editForm: FormGroup;
  isSubmitting: boolean = false;
  employee: Employee;
  showImageUpload: boolean = false;
  selectedImageFile: File | null = null;
  availableManagers: Employee[] = []; // À remplir avec la liste des managers

  constructor(
    private formBuilder: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: object,
    private dialogRef: MatDialogRef<EditEmployeeModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee: Employee }
  ) {
    this.employee = data.employee;
    this.editForm = this.createEditForm();
    // TODO: Charger la liste des managers disponibles
    this.loadAvailableManagers();
  }

  ngOnInit(): void {
    this.loadAvailableManagers();
    // Remplir le formulaire avec les données de l'employé
    if (this.employee) {
      this.editForm.patchValue({
        firstName: this.employee.firstName,
        lastName: this.employee.lastName,
        email: this.employee.email,
        phone: this.employee.phone || '',
        position: this.employee.position,
        department: this.employee.department,
        contractType: this.employee.contractType,
        hireDate: this.formatDateForInput(this.employee.hireDate),
        managerId: this.employee.manager?.id || '',
        vacationBalance: this.employee.leaveBalance.vacation,
        rttBalance: this.employee.leaveBalance.rtt || 0,
        sickBalance: this.employee.leaveBalance.sick,
        personalBalance: this.employee.leaveBalance.personal,
      });
    }
  }

  ngOnDestroy(): void {
    // MatDialog gère automatiquement le nettoyage
  }

  createEditForm(): FormGroup {
    return this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)\.]{10,}$/)]],
      position: ['', [Validators.required]],
      department: ['', [Validators.required]],
      contractType: ['', [Validators.required]],
      hireDate: ['', [Validators.required]],
      managerId: [''],
      vacationBalance: [0, [Validators.min(0)]],
      rttBalance: [0, [Validators.min(0)]],
      sickBalance: [0, [Validators.min(0)]],
      personalBalance: [0, [Validators.min(0)]],
    });
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.employee) {
      this.isSubmitting = true;

      // Trouver le manager sélectionné
      const selectedManager = this.availableManagers.find(
        (manager) => manager.id === this.editForm.value.managerId
      );

      const updatedEmployee: Employee = {
        ...this.employee,
        firstName: this.editForm.value.firstName,
        lastName: this.editForm.value.lastName,
        email: this.editForm.value.email,
        phone: this.editForm.value.phone,
        position: this.editForm.value.position,
        department: this.editForm.value.department,
        contractType: this.editForm.value.contractType,
        hireDate: new Date(this.editForm.value.hireDate),
        manager: selectedManager,
        leaveBalance: {
          vacation: this.editForm.value.vacationBalance,
          sick: this.editForm.value.sickBalance,
          personal: this.editForm.value.personalBalance,
          rtt: this.editForm.value.rttBalance,
          totalDaysUsed: this.employee.leaveBalance.totalDaysUsed,
          totalDaysRemaining: this.calculateTotalDaysRemaining(),
        },
        // Conserver l'image existante ou utiliser la nouvelle
        profilePicture: this.selectedImageFile
          ? URL.createObjectURL(this.selectedImageFile)
          : this.employee.profilePicture,
      };

      // Simulation d'une sauvegarde - remplacez par votre service réel
      setTimeout(() => {
        this.dialogRef.close(updatedEmployee);
      }, 1000);
    }
  }

  // Helper pour obtenir les erreurs du formulaire
  getFieldError(fieldName: string): string | null {
    const field = this.editForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return 'Ce champ est obligatoire';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      }
      if (field.errors['email']) {
        return 'Format email invalide';
      }
      if (field.errors['pattern']) {
        if (fieldName === 'phone') {
          return 'Format de téléphone invalide';
        }
      }
      if (field.errors['min']) {
        return 'La valeur doit être positive';
      }
    }
    return null;
  }

  // Méthodes pour la gestion de l'image
  toggleImageUpload(): void {
    this.showImageUpload = !this.showImageUpload;
  }

  cancelImageUpload(): void {
    this.showImageUpload = false;
    this.selectedImageFile = null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Vérifier le type de fichier
      if (file.type.startsWith('image/')) {
        // Vérifier la taille (max 5MB)
        if (file.size <= 5 * 1024 * 1024) {
          this.selectedImageFile = file;

          // Prévisualiser l'image
          const reader = new FileReader();
          reader.onload = (e) => {
            if (this.employee) {
              this.employee.profilePicture = e.target?.result as string;
            }
          };
          reader.readAsDataURL(file);

          this.showImageUpload = false;
        } else {
          alert("La taille de l'image ne doit pas dépasser 5MB");
        }
      } else {
        alert('Veuillez sélectionner un fichier image valide');
      }
    }
  }

  // Utilitaires
  private loadAvailableManagers(): void {
    // TODO: Remplacer par un appel à votre service
    // Pour l'exemple, on crée quelques managers fictifs
    this.availableManagers = [
      {
        id: 'mgr1',
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie.dupont@company.com',
        position: 'Directrice RH',
        department: 'RH',
        contractType: ContractType.CDI,
        hireDate: new Date('2020-01-15'),
        leaveBalance: {
          vacation: 25,
          sick: 0,
          personal: 5,
          rtt: 12,
          totalDaysUsed: 10,
          totalDaysRemaining: 20,
        },
      },
      {
        id: 'mgr2',
        firstName: 'Pierre',
        lastName: 'Martin',
        email: 'pierre.martin@company.com',
        position: 'Chef de projet',
        department: 'Développement',
        contractType: ContractType.CDI,
        hireDate: new Date('2019-03-10'),
        leaveBalance: {
          vacation: 25,
          sick: 2,
          personal: 3,
          rtt: 8,
          totalDaysUsed: 15,
          totalDaysRemaining: 15,
        },
      },
    ];
  }

  private formatDateForInput(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  private calculateTotalDaysRemaining(): number {
    const vacation = this.editForm.value.vacationBalance || 0;
    const sick = this.editForm.value.sickBalance || 0;
    const personal = this.editForm.value.personalBalance || 0;
    const rtt = this.editForm.value.rttBalance || 0;

    return (
      vacation +
      sick +
      personal +
      rtt -
      (this.employee?.leaveBalance?.totalDaysUsed || 0)
    );
  }

  // Méthode pour gérer l'erreur de chargement d'image
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/default-avatar.svg';
    }
  }

  // Empêcher la propagation des événements pour éviter la fermeture accidentelle
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
