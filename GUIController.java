package fxTelevisiosarjat;

import javafx.fxml.FXML;
import javafx.fxml.Initializable;

import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;
import fi.jyu.mit.fxgui.ModalController;
import fi.jyu.mit.fxgui.StringGrid;
import fi.jyu.mit.fxgui.StringGrid.GridRowItem;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import televisiosarjat.Televisiosarjat;
import televisiosarjat.Kayttaja;
import televisiosarjat.KayttajanData;
import televisiosarjat.Sarja;
import javafx.application.Platform;

/**
 * Pääikkuna
 */
public class TelevisiosarjatGUIController implements Initializable {
    @FXML private Label header_sarjan_nimi;
    @FXML private TextField edit_sarjan_nimi;
    @FXML private TextField edit_julkaisuvuosi;
    @FXML private TextField edit_kausien_maara;
    @FXML private TextField edit_paivityspvm;
    @FXML private TextField edit_arvostelu;
    @FXML private TextArea edit_muistiinpanot;
    @FXML private ComboBox<String> edit_sarjan_status = new ComboBox<String>();
    @FXML private ComboBox<String> edit_katsontastatus = new ComboBox<String>();
    @FXML private StringGrid<Sarja> main_table;
    @FXML private CheckBox kayttajanOmatCheckBox;
    @FXML private TextField hakukentta;
    @FXML private Label arvostelutYht;
    
    private static Stage stage;
    private Televisiosarjat paaohjelma;
    private boolean ohitaSyottotietojenPaivitys = false;
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        // Haetaan ComboBox-valikkojen arvot
        for (int i = 0; i < Sarja.getTuotantostatukset().size() - 1; i++) {
            edit_sarjan_status.getItems().add(Sarja.getTuotantostatukset().get(i));
        }
        for (int i = 0; i < KayttajanData.getKatsontastatukset().size() - 1; i++) {
            edit_katsontastatus.getItems().add(KayttajanData.getKatsontastatukset().get(i));
        }
        edit_sarjan_status.getSelectionModel().selectFirst();
        edit_katsontastatus.getSelectionModel().selectFirst();
        
        // Alustetaan rekisterin päätaulukko oikealla toiminnallisuudella
        main_table.initTable(KayttajanData.getOtsikot());
        main_table.setOnCellString( (g, sarja, defValue, r, c) -> sarja.anna(c, paaohjelma.getKayttaja()) );
        main_table.setOnCellValue( (g, sarja, defValue, r, c) -> sarja.anna(c, paaohjelma.getKayttaja()) );
        
        main_table.getSelectionModel().selectedItemProperty().addListener((observableValue, oldSelection, newSelection) -> {
            if (newSelection == null || ohitaSyottotietojenPaivitys) return;
            
            // Poistetaan aiemman rivin oikeellisuustarkistuksien korostukset
            edit_julkaisuvuosi.setStyle("");
            edit_kausien_maara.setStyle("");
            edit_arvostelu.setStyle("");
            
            // Päivitetään syöttökentän tiedot vastaamaan valitun rivin tietoja
            Kayttaja kayttaja = paaohjelma.getKayttaja();
            edit_sarjan_nimi.setText(newSelection.getItem().getNimi());
            edit_kausien_maara.setText(Televisiosarjat.integerToString(newSelection.getItem().getKausienMaara()));
            edit_julkaisuvuosi.setText(Televisiosarjat.integerToString(newSelection.getItem().getJulkaisuvuosi()));
            edit_sarjan_status.getSelectionModel().clearAndSelect(newSelection.getItem().getTuotantostatus());
            if (newSelection.getItem().getKayttajanDatat().get(kayttaja) != null) {
                edit_katsontastatus.getSelectionModel().clearAndSelect(
                        newSelection.getItem().getKayttajanDatat().get(kayttaja).getKatsontastatus());
            }
            else edit_katsontastatus.getSelectionModel().clearAndSelect(0);
            edit_paivityspvm.setText(newSelection.getItem().anna(5, kayttaja));
            edit_arvostelu.setText(newSelection.getItem().anna(6, kayttaja));
            arvostelutYht.setText(newSelection.getItem().anna(7, kayttaja));
            edit_muistiinpanot.setText(newSelection.getItem().anna(8, kayttaja));
        });
    }
    
    /**
     * Vaihtaa käyttäjää (FXML)
     */
    @FXML private void handleVaihdaKayttajaa() {
        vaihdaKayttajaa();
    }
    
    /**
     * Vaihtaa käyttäjää
     */
    public void vaihdaKayttajaa() {
        ModalController.showModal(LoginScreenGUIController.class.getResource("LoginScreen.fxml"), "Kirjaudu", null, paaohjelma);
        paivitaTaulukko();
    }
    
    /**
     * Vie sarjadatan tekstitiedostoon
     */
    @FXML private void handleVienti() {
        // Valitaan tiedosto Windowsing omalla valintaikkunalla
        FileChooser fileChooser = new FileChooser();
        File file = fileChooser.showSaveDialog(null);
        if (file == null) return;
        
        // Haetaan rekisterin tiedot
        List<String> teksti = new ArrayList<String>();
        teksti.add("Käyttäjä | " + String.join(" | ", KayttajanData.getOtsikot()) + "\n");
        for (GridRowItem<Sarja> rivi : main_table.getItems()) {
            Sarja sarja = rivi.getItem();
            for (Map.Entry<Kayttaja, KayttajanData> entry : sarja.getKayttajanDatat().entrySet()) {
                teksti.add(String.format("%s | %s | %s | %s | %s | %s | %s | %s | %s | %s\n",
                        entry.getKey().getNimi(),
                        sarja.anna(0, entry.getKey()),
                        sarja.anna(1, entry.getKey()),
                        sarja.anna(2, entry.getKey()),
                        sarja.anna(3, entry.getKey()),
                        sarja.anna(4, entry.getKey()),
                        sarja.anna(5, entry.getKey()),
                        sarja.anna(6, entry.getKey()),
                        sarja.anna(7, entry.getKey()),
                        sarja.anna(8, entry.getKey())
                        ));
            }
        }
        
        // Kirjoitetaan tiedostoon
        try (BufferedWriter writer = Files.newBufferedWriter(Paths.get(file.getAbsolutePath()), StandardCharsets.UTF_8)) {
            for (String s : teksti) writer.write(s);
        } catch (IOException ex) {
            //
        }
    }
    
    /**
     * Lisää uuden sarjan
     */
    @FXML private void handleUusiSarja() {
        Sarja sarja = paaohjelma.lisaaSarja(
                edit_sarjan_nimi.getText(),
                Televisiosarjat.parseToInteger(edit_julkaisuvuosi.getText()),
                Televisiosarjat.parseToInteger(edit_kausien_maara.getText()),
                edit_sarjan_status.getSelectionModel().getSelectedIndex(),
                edit_katsontastatus.getSelectionModel().getSelectedIndex(),
                Televisiosarjat.parseToInteger(edit_paivityspvm.getText()),
                Televisiosarjat.parseToInteger(edit_arvostelu.getText()),
                edit_muistiinpanot.getText());
        main_table.add(sarja);
    }
    
    /**
     * Poistaa sarjan
     */
    @FXML private void handlePoistaSarja() {
        // Poistetaan taulukossa valittua riviä vastaava sarja
        GridRowItem<Sarja> valittuRivi = main_table.getSelectionModel().getSelectedItem();
        if (valittuRivi == null) return;
        paaohjelma.poistaSarja(valittuRivi.getItem());
        paivitaTaulukko();
        
        // Käyttäjän mielenterveyden vuoksi valitaan taulukosta poistetun rivin viereinen rivi
        if (main_table.getItems().size() > 0) {
            if (valittuRivi.getRowNr() == 0) main_table.selectRow(0);
            else main_table.selectRow(valittuRivi.getRowNr() - 1);
        }
    }
    
    /**
     * Resettaa rekisterin päätaulukon rivit
     */
    public void paivitaTaulukko() {
        main_table.clear();
        for (Sarja sarja : paaohjelma.getSarjat().filtteroi(
                hakukentta.getText(), paaohjelma.getKayttaja(), kayttajanOmatCheckBox.isSelected())) {
            main_table.add(sarja);
        }
    }
    
    /**
     * Päivittää rekisterin päätaulukon rivit käyttäjän omilla sarjoilla
     */
    @FXML private void handleKayttajanOmatSarjat() {
        paivitaTaulukko();
    }
    
    /**
     * Avaa kirjautumisikkunan, jossa pystyy lisätä käyttäjiä
     */
    @FXML private void handleLisaaKayttaja() {
        handleVaihdaKayttajaa();
    }
    
    /**
     * Avaa kirjautumisikkunan, jossa pystyy poistaa käyttäjiä
     */
    @FXML private void handlePoistaKayttaja() {
        handleVaihdaKayttajaa();
    }
    
    /**
     * Avaa ohjeikkunan
     */
    @FXML private void handleOhje() {
        ModalController.showModal(InfoScreenGUIController.class.getResource("HelpScreen.fxml"), "Apua", null, null);
    }
    
    /**
     * Avaa ikkunan, jossa on tietoja ohjelmasta
     */
    @FXML private void handleInfoScreen() {
        ModalController.showModal(InfoScreenGUIController.class.getResource("InfoScreen.fxml"), "Tietoja", null, null);
    }
    
    /**
     * Tallentaa muutokset (FXML)
     */
    @FXML private void handleTallenna() {
        tallenna();
    }
    
    /**
     * Sulkee ohjelman
     */
    @FXML private void handleLopeta() {
        Platform.exit();
    }
    
    /**
     * Filtteröi taulukkoa
     */
    @FXML private void handleFiltteri() {
        paivitaTaulukko();
    }
    
    /**
     * Tallentaa muutokset.
     */
    private void tallenna() {
        int valittuRivi = main_table.getSelectionModel().getSelectedIndex();
        
        // Tarkistaa syötteiden oikeellisuuden ja asettaa oikeelliset tiedot päätaulukossa valittuun Sarjaan
        GridRowItem<Sarja> gridRow = main_table.getSelectionModel().getSelectedItem();
        if (gridRow == null) {
            paaohjelma.kirjoitaTiedostot();
            return;
        }
        
        Sarja sarja = gridRow.getItem();
        sarja.setNimi(Televisiosarjat.nonNullString(edit_sarjan_nimi.getText()));
        if (!sarja.setJulkaisuvuosi(Televisiosarjat.parseToInteger(edit_julkaisuvuosi.getText())) && edit_julkaisuvuosi.getText() != "") {
            edit_julkaisuvuosi.setStyle("-fx-background-color: red;");
        }
        else edit_julkaisuvuosi.setStyle("");
        if (!sarja.setKausienMaara(Televisiosarjat.parseToInteger(edit_kausien_maara.getText())) && edit_kausien_maara.getText() != "") {
            edit_kausien_maara.setStyle("-fx-background-color: red;");
        }
        else edit_kausien_maara.setStyle("");
        sarja.setTuotantostatus(edit_sarjan_status.getSelectionModel().getSelectedIndex());
        
        // Tehdään yllämainittu sarjan käyttäjänDatalle
        KayttajanData kd = sarja.getKayttajanDatat().get(paaohjelma.getKayttaja());
        if (kd == null) kd = paaohjelma.lisaaKayttajanData(sarja, null, null, null, null);
        kd.setKatsontastatus(edit_katsontastatus.getSelectionModel().getSelectedIndex());
        if (!kd.setPaivitysvuosi(Televisiosarjat.parseToInteger(edit_paivityspvm.getText())) && edit_paivityspvm.getText() != "") {
            edit_paivityspvm.setStyle("-fx-background-color: red;");
        }
        else edit_paivityspvm.setStyle("");
        if (!kd.setArvostelu(Televisiosarjat.parseToInteger(edit_arvostelu.getText())) && edit_arvostelu.getText() != "") {
            edit_arvostelu.setStyle("-fx-background-color: red;");
        }
        else edit_arvostelu.setStyle("");
        kd.setMuistiinpanot(Televisiosarjat.nonNullString(edit_muistiinpanot.getText()));
        sarja.lisaaKayttajanData(kd);
        
        paivitaTaulukko();
        ohitaSyottotietojenPaivitys = true;
        main_table.getSelectionModel().select(valittuRivi);
        ohitaSyottotietojenPaivitys = false;
        arvostelutYht.setText(main_table.getSelectionModel().getSelectedItem().getItem().anna(7, paaohjelma.getKayttaja()));
        paaohjelma.kirjoitaTiedostot();
    }

    /**
     * @return stage
     */
    public static Stage getStage() {
        return stage;
    }

    /**
     * @param stage stage
     */
    public static void setStage(Stage stage) {
        TelevisiosarjatGUIController.stage = stage;
    }
    
    /**
     * @param paaohjelma Televisiosarjat-ohjelma
     */
    public void setPaaohjelma(Televisiosarjat paaohjelma) {
        this.paaohjelma = paaohjelma;
    }
    
    
}
