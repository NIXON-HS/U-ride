from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Prueba del Sistema - Registrarse e Iniciar Sesión
drive = webdriver.Chrome()
drive.maximize_window()
drive.get("http://localhost:5173")
time.sleep(2)

# ----- Registrarse -----
crearCuenta = drive.find_element(By.XPATH, "//button[contains(text(), 'Crear cuenta UTA')]")
crearCuenta.click()
time.sleep(10)

nombre = drive.find_element(By.XPATH, "//input[@placeholder='Tu nombre']")
nombre.send_keys("Nixon Hurtado")
time.sleep(10)

correo_reg = drive.find_element(By.XPATH, "//input[@placeholder='correo@uta.edu.ec']")
correo_reg.send_keys("nhurtado8962@uta.edu.ec")
time.sleep(10)

# En la pantalla de registro hay 2 campos de contraseña (contraseña y confirmar contraseña)
pass_inputs = drive.find_elements(By.XPATH, "//input[@type='password']")
pass_inputs[0].send_keys("12345678")
time.sleep(10)
pass_inputs[1].send_keys("12345678")
time.sleep(10)

enviar_codigo = drive.find_element(By.XPATH, "//button[@type='submit']")
enviar_codigo.click()
time.sleep(10)

# --- INGRESO DEL CÓDIGO DE VERIFICACIÓN ---
# Aquí el script se pausa y espera a que escribas el código en la terminal
codigo_verificacion = input(">>> Revisa tu correo y escribe el código de 6 dígitos aquí: ")

# Escribir el código en la página
input_codigo = drive.find_element(By.XPATH, "//input[@placeholder='000000']")
input_codigo.send_keys(codigo_verificacion)
time.sleep(10)

# Clic en "Crear cuenta"
crear_cuenta_btn = drive.find_element(By.XPATH, "//button[@type='submit']")
crear_cuenta_btn.click()
time.sleep(10)

# ----- Iniciar Sesión -----
correo_login = drive.find_element(By.XPATH, "//input[@placeholder='correo@uta.edu.ec']")
correo_login.clear()
correo_login.send_keys("nhurtado8962@uta.edu.ec")
time.sleep(10)

pass_login = drive.find_element(By.XPATH, "//input[@placeholder='Ingresa tu contrasena']")
pass_login.clear()
pass_login.send_keys("12345678")
time.sleep(10)

acceder = drive.find_element(By.XPATH, "//button[@type='submit']")
acceder.click()
time.sleep(10)

# Cerrar el navegador después de ver el resultado
drive.quit()
